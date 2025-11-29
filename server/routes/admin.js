/**
 * Admin Routes
 * Benutzerverwaltung, Settings, Import/Export
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { body, param, validationResult } = require('express-validator');
const XLSX = require('xlsx');
const { requireAuth } = require('../middleware/auth');
const { requireRole, requireAdmin, ROLES } = require('../middleware/roleCheck');
const { berechneNaechstenAufstieg, ENTGELTGRUPPEN } = require('../services/tarifCalculator');
const { berechneGehalt } = require('../services/salaryCalculator');
const { checkStufenaufstiege } = require('../services/cronJobs');
const { testConnection } = require('../services/emailService');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Excel Epoch Offset (in days)
 * Excel uses January 1, 1900 as day 1, while JavaScript uses January 1, 1970.
 * The difference is 25569 days (including the Excel leap year bug for 1900).
 * Used to convert Excel serial date numbers to JavaScript Date objects.
 */
const EXCEL_EPOCH_OFFSET = 25569;
const MS_PER_DAY = 86400 * 1000;

/**
 * Converts an Excel serial date number to a JavaScript Date
 * @param {number} excelDate - Excel serial date number
 * @returns {Date} JavaScript Date object
 */
function excelDateToJSDate(excelDate) {
  return new Date((excelDate - EXCEL_EPOCH_OFFSET) * MS_PER_DAY);
}

router.use(requireAuth);

// =====================
// BENUTZER-VERWALTUNG
// =====================

/**
 * GET /api/admin/users
 * Liste aller Benutzer (nur Admin)
 */
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        departmentAccess: true,
        active: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { username: 'asc' }
    });

    res.json({ users });
  } catch (error) {
    console.error('Fehler bei GET /users:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

/**
 * POST /api/admin/users
 * Neuen Benutzer erstellen (nur Admin)
 */
router.post('/users', requireAdmin, [
  body('username').trim().notEmpty().withMessage('Benutzername erforderlich'),
  body('password').isLength({ min: 6 }).withMessage('Passwort muss mind. 6 Zeichen haben'),
  body('role').isIn(['Admin', 'Editor', 'Viewer']).withMessage('Ungültige Rolle')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, role, departmentAccess } = req.body;

    // Prüfe ob Benutzername bereits existiert
    const existing = await prisma.user.findUnique({
      where: { username }
    });

    if (existing) {
      return res.status(400).json({ error: 'Benutzername bereits vergeben' });
    }

    // Passwort hashen
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role,
        departmentAccess
      },
      select: {
        id: true,
        username: true,
        role: true,
        departmentAccess: true,
        createdAt: true
      }
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_CREATED',
        details: JSON.stringify({ 
          newUserId: user.id,
          username: user.username,
          role: user.role,
          createdBy: req.user.username 
        })
      }
    });

    res.status(201).json({ success: true, user });

  } catch (error) {
    console.error('Fehler bei POST /users:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Benutzer aktualisieren (nur Admin)
 */
router.put('/users/:id', requireAdmin, [
  param('id').isInt().withMessage('Ungültige ID')
], async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { username, password, role, departmentAccess, active } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (role !== undefined) updateData.role = role;
    if (departmentAccess !== undefined) updateData.departmentAccess = departmentAccess;
    if (active !== undefined) updateData.active = active;
    
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        departmentAccess: true,
        active: true,
        updatedAt: true
      }
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_UPDATED',
        details: JSON.stringify({ 
          targetUserId: id,
          username: user.username,
          changes: Object.keys(updateData),
          updatedBy: req.user.username 
        })
      }
    });

    res.json({ success: true, user });

  } catch (error) {
    console.error('Fehler bei PUT /users/:id:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Benutzer löschen (nur Admin)
 */
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Verhindere Selbstlöschung
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Sie können sich nicht selbst löschen' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    await prisma.user.delete({ where: { id } });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_DELETED',
        details: JSON.stringify({ 
          deletedUserId: id,
          username: user.username,
          deletedBy: req.user.username 
        })
      }
    });

    res.json({ success: true, message: 'Benutzer gelöscht' });

  } catch (error) {
    console.error('Fehler bei DELETE /users/:id:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// =====================
// EINSTELLUNGEN
// =====================

/**
 * GET /api/admin/settings/public
 * Öffentliche Einstellungen (für alle authentifizierten Benutzer)
 * Gibt nur company_name zurück
 */
router.get('/settings/public', async (req, res) => {
  try {
    const companySetting = await prisma.setting.findUnique({
      where: { key: 'company_name' }
    });

    res.json({ 
      company_name: companySetting?.value || 'Lohnmonitor'
    });
  } catch (error) {
    console.error('Fehler bei GET /settings/public:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

/**
 * GET /api/admin/settings
 * Alle Einstellungen (nur Admin)
 */
router.get('/settings', requireAdmin, async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    
    // Zu Object konvertieren
    const settingsObject = {};
    for (const s of settings) {
      settingsObject[s.key] = s.value;
    }

    res.json({ settings: settingsObject });
  } catch (error) {
    console.error('Fehler bei GET /settings:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

/**
 * PUT /api/admin/settings
 * Einstellungen aktualisieren (nur Admin)
 */
router.put('/settings', requireAdmin, async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Ungültige Einstellungen' });
    }

    for (const [key, value] of Object.entries(settings)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      });
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'SETTINGS_UPDATED',
        details: JSON.stringify({ 
          keys: Object.keys(settings),
          updatedBy: req.user.username 
        })
      }
    });

    res.json({ success: true, message: 'Einstellungen gespeichert' });

  } catch (error) {
    console.error('Fehler bei PUT /settings:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// =====================
// IMPORT / EXPORT
// =====================

/**
 * GET /api/admin/export/employees
 * Export Mitarbeiter als Excel (Admin/Editor)
 */
router.get('/export/employees', requireRole([ROLES.ADMIN, ROLES.EDITOR]), async (req, res) => {
  try {
    const { includeInactive } = req.query;
    
    const where = {};
    if (includeInactive !== 'true') {
      where.aktiv = true;
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { personalnummer: 'asc' }
    });

    // Basis Wochenstunden
    const basisWochenstundenSetting = await prisma.setting.findUnique({
      where: { key: 'basis_wochenstunden' }
    });
    const basisWochenstunden = basisWochenstundenSetting 
      ? parseFloat(basisWochenstundenSetting.value) 
      : 40;

    // Daten für Excel vorbereiten
    const data = employees.map(emp => {
      const gehalt = berechneGehalt(emp, basisWochenstunden);
      let zulagen = {};
      try {
        zulagen = JSON.parse(emp.zulagen || '{}');
      } catch (e) {}

      return {
        'Personalnummer': emp.personalnummer,
        'Name': emp.name,
        'Qualifikation': emp.qualifikation || '',
        'Abteilung': emp.abteilung || '',
        'Eintrittsdatum': emp.eintrittsdatum?.toISOString().split('T')[0] || '',
        'Entgeltgruppe': emp.entgeltgruppe,
        'Stufe': emp.stufe,
        'Nächster Aufstieg': emp.naechsterAufstieg?.toISOString().split('T')[0] || '',
        'Wochenstunden': emp.wochenstunden,
        'Stundenlohn': emp.stundenlohn,
        'Zulage Gruppe': zulagen.gruppe || 0,
        'Zulage Schicht': zulagen.schicht || 0,
        'TL 100€': zulagen.tl100 ? 'Ja' : 'Nein',
        'TL 150€': zulagen.tl150 ? 'Ja' : 'Nein',
        'Brutto Gesamt': gehalt.gesamtBrutto,
        'Aktiv': emp.aktiv ? 'Ja' : 'Nein'
      };
    });

    // Excel erstellen
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Spaltenbreiten setzen
    ws['!cols'] = [
      { wch: 15 }, // Personalnummer
      { wch: 25 }, // Name
      { wch: 20 }, // Qualifikation
      { wch: 15 }, // Abteilung
      { wch: 12 }, // Eintrittsdatum
      { wch: 12 }, // Entgeltgruppe
      { wch: 8 },  // Stufe
      { wch: 15 }, // Nächster Aufstieg
      { wch: 12 }, // Wochenstunden
      { wch: 12 }, // Stundenlohn
      { wch: 12 }, // Zulage Gruppe
      { wch: 12 }, // Zulage Schicht
      { wch: 10 }, // TL 100
      { wch: 10 }, // TL 150
      { wch: 12 }, // Brutto
      { wch: 8 }   // Aktiv
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Mitarbeiter');

    // Buffer erstellen
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'EXPORT_EMPLOYEES',
        details: JSON.stringify({ 
          count: employees.length,
          exportedBy: req.user.username 
        })
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Mitarbeiter_Export_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(buffer);

  } catch (error) {
    console.error('Fehler bei Export:', error);
    res.status(500).json({ error: 'Fehler beim Export' });
  }
});

/**
 * POST /api/admin/import/employees
 * Import Mitarbeiter aus Excel (Admin/Editor)
 */
router.post('/import/employees', requireRole([ROLES.ADMIN, ROLES.EDITOR]), async (req, res) => {
  try {
    const { data } = req.body; // Base64-encoded Excel oder JSON-Array

    if (!data) {
      return res.status(400).json({ error: 'Keine Daten zum Import' });
    }

    let employees = [];

    // Prüfe ob JSON-Array oder Base64-Excel
    if (Array.isArray(data)) {
      employees = data;
    } else {
      // Base64 Excel dekodieren
      const buffer = Buffer.from(data, 'base64');
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      employees = XLSX.utils.sheet_to_json(ws);
    }

    if (!employees.length) {
      return res.status(400).json({ error: 'Keine Mitarbeiter in den Daten gefunden' });
    }

    let imported = 0;
    let updated = 0;
    let errors = [];

    for (const row of employees) {
      try {
        const personalnummer = String(row['Personalnummer'] || row.personalnummer || '').trim();
        if (!personalnummer) {
          errors.push(`Zeile ohne Personalnummer übersprungen`);
          continue;
        }

        const name = row['Name'] || row.name || '';
        const qualifikation = row['Qualifikation'] || row.qualifikation || null;
        const abteilung = row['Abteilung'] || row.abteilung || null;
        const eintrittsdatum = row['Eintrittsdatum'] || row.eintrittsdatum;
        const entgeltgruppe = row['Entgeltgruppe'] || row.entgeltgruppe || 'E5';
        const stufe = parseInt(row['Stufe'] || row.stufe || 1);
        const wochenstunden = parseFloat(row['Wochenstunden'] || row.wochenstunden || 40);
        const stundenlohn = parseFloat(row['Stundenlohn'] || row.stundenlohn || 15);

        // Zulagen
        const zulagen = {
          gruppe: parseFloat(row['Zulage Gruppe'] || row.zulagenGruppe || 0),
          schicht: parseFloat(row['Zulage Schicht'] || row.zulagenSchicht || 0),
          tl100: (row['TL 100€'] || row.tl100) === 'Ja' || row.tl100 === true,
          tl150: (row['TL 150€'] || row.tl150) === 'Ja' || row.tl150 === true
        };

        // Eintrittsdatum parsen
        let parsedEintrittsdatum;
        if (eintrittsdatum) {
          if (typeof eintrittsdatum === 'number') {
            // Excel serial date number - convert to JavaScript Date
            parsedEintrittsdatum = excelDateToJSDate(eintrittsdatum);
          } else {
            parsedEintrittsdatum = new Date(eintrittsdatum);
          }
        } else {
          parsedEintrittsdatum = new Date();
        }

        // Nächsten Aufstieg berechnen
        const naechsterAufstieg = berechneNaechstenAufstieg(parsedEintrittsdatum, stufe);

        // Upsert (erstellen oder aktualisieren)
        const existing = await prisma.employee.findUnique({
          where: { personalnummer }
        });

        if (existing) {
          await prisma.employee.update({
            where: { personalnummer },
            data: {
              name,
              qualifikation,
              abteilung,
              eintrittsdatum: parsedEintrittsdatum,
              entgeltgruppe,
              stufe,
              naechsterAufstieg,
              wochenstunden,
              stundenlohn,
              zulagen: JSON.stringify(zulagen)
            }
          });
          updated++;
        } else {
          await prisma.employee.create({
            data: {
              personalnummer,
              name,
              qualifikation,
              abteilung,
              eintrittsdatum: parsedEintrittsdatum,
              entgeltgruppe,
              stufe,
              naechsterAufstieg,
              wochenstunden,
              stundenlohn,
              zulagen: JSON.stringify(zulagen)
            }
          });
          imported++;
        }

      } catch (rowError) {
        errors.push(`Fehler bei PN ${row['Personalnummer'] || '?'}: ${rowError.message}`);
      }
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'IMPORT_EMPLOYEES',
        details: JSON.stringify({ 
          imported,
          updated,
          errors: errors.length,
          importedBy: req.user.username 
        })
      }
    });

    res.json({
      success: true,
      message: `Import abgeschlossen: ${imported} neu, ${updated} aktualisiert`,
      imported,
      updated,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Fehler bei Import:', error);
    res.status(500).json({ error: 'Fehler beim Import' });
  }
});

/**
 * GET /api/admin/import/template
 * Download Import-Vorlage
 */
router.get('/import/template', requireRole([ROLES.ADMIN, ROLES.EDITOR]), (req, res) => {
  try {
    const template = [
      {
        'Personalnummer': '1001',
        'Name': 'Max Mustermann',
        'Qualifikation': 'Pflegefachkraft',
        'Abteilung': 'Pflege',
        'Eintrittsdatum': '2020-01-15',
        'Entgeltgruppe': 'E7',
        'Stufe': 3,
        'Wochenstunden': 38.5,
        'Stundenlohn': 18.50,
        'Zulage Gruppe': 50,
        'Zulage Schicht': 75,
        'TL 100€': 'Nein',
        'TL 150€': 'Nein'
      },
      {
        'Personalnummer': '1002',
        'Name': 'Erika Beispiel',
        'Qualifikation': 'Pflegehilfe',
        'Abteilung': 'Pflege',
        'Eintrittsdatum': '2022-06-01',
        'Entgeltgruppe': 'E5',
        'Stufe': 1,
        'Wochenstunden': 30,
        'Stundenlohn': 15.00,
        'Zulage Gruppe': 0,
        'Zulage Schicht': 50,
        'TL 100€': 'Nein',
        'TL 150€': 'Nein'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(template);
    
    ws['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }, { wch: 8 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Import-Vorlage');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Mitarbeiter_Import_Vorlage.xlsx"');
    res.send(buffer);

  } catch (error) {
    console.error('Fehler bei Template-Download:', error);
    res.status(500).json({ error: 'Fehler beim Template-Download' });
  }
});

// =====================
// AUDIT LOG
// =====================

/**
 * GET /api/admin/audit-log
 * Audit-Log anzeigen (nur Admin)
 */
router.get('/audit-log', requireAdmin, async (req, res) => {
  try {
    const { limit = 100, action } = req.query;

    const where = {};
    if (action) where.action = action;

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { username: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit)
    });

    res.json({ logs });

  } catch (error) {
    console.error('Fehler bei GET /audit-log:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// =====================
// SYSTEM
// =====================

/**
 * POST /api/admin/trigger-check
 * Manueller Alarm-Check (nur Admin)
 */
router.post('/trigger-check', requireAdmin, async (req, res) => {
  try {
    const result = await checkStufenaufstiege();

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'MANUAL_ALARM_CHECK',
        details: JSON.stringify({ 
          result,
          triggeredBy: req.user.username 
        })
      }
    });

    res.json({ 
      success: true, 
      message: 'Alarm-Check durchgeführt',
      ...result 
    });

  } catch (error) {
    console.error('Fehler bei Alarm-Check:', error);
    res.status(500).json({ error: 'Fehler beim Alarm-Check' });
  }
});

/**
 * POST /api/admin/test-email
 * E-Mail-Verbindung testen (nur Admin)
 */
router.post('/test-email', requireAdmin, async (req, res) => {
  try {
    const result = await testConnection();
    res.json({ 
      success: result.success, 
      message: result.success ? 'SMTP-Verbindung erfolgreich' : result.reason 
    });

  } catch (error) {
    console.error('Fehler bei E-Mail-Test:', error);
    res.status(500).json({ error: 'Fehler beim E-Mail-Test' });
  }
});

/**
 * GET /api/admin/entgeltgruppen
 * Liste aller Entgeltgruppen
 */
router.get('/entgeltgruppen', async (req, res) => {
  res.json({ entgeltgruppen: ENTGELTGRUPPEN });
});

module.exports = router;
