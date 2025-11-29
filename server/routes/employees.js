/**
 * Employee Routes
 * CRUD-Operationen für Mitarbeiter
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, param, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { requireRole, isViewer, ROLES } = require('../middleware/roleCheck');
const { berechneNaechstenAufstieg } = require('../services/tarifCalculator');
const { berechneGehalt } = require('../services/salaryCalculator');

const router = express.Router();
const prisma = new PrismaClient();

// Alle Routen benötigen Auth
router.use(requireAuth);

/**
 * GET /api/employees
 * Liste aller aktiven Mitarbeiter
 */
router.get('/', async (req, res) => {
  try {
    const { abteilung, includeInactive } = req.query;
    
    // Filter aufbauen
    const where = {};
    if (!includeInactive || includeInactive !== 'true') {
      where.aktiv = true;
    }
    if (abteilung) {
      where.abteilung = abteilung;
    }

    // Abteilungszugriff für nicht-Admins
    if (req.user.role !== ROLES.ADMIN && req.user.departmentAccess) {
      const allowedDepts = req.user.departmentAccess.split(',').map(d => d.trim());
      if (allowedDepts.length > 0) {
        where.abteilung = { in: allowedDepts };
      }
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: [
        { naechsterAufstieg: 'asc' },
        { name: 'asc' }
      ]
    });

    // Für Viewer: Namen maskieren
    const isViewerUser = isViewer(req.user);
    
    // Basis Wochenstunden aus Settings
    const basisWochenstundenSetting = await prisma.setting.findUnique({
      where: { key: 'basis_wochenstunden' }
    });
    const basisWochenstunden = basisWochenstundenSetting 
      ? parseFloat(basisWochenstundenSetting.value) 
      : 40;

    const result = employees.map(emp => {
      const gehalt = berechneGehalt(emp, basisWochenstunden);
      
      return {
        ...emp,
        name: isViewerUser ? `🔒 PN: ${emp.personalnummer}` : emp.name,
        gehalt
      };
    });

    res.json({ employees: result });
  } catch (error) {
    console.error('Fehler bei GET /employees:', error);
    res.status(500).json({ error: 'Serverfehler beim Laden der Mitarbeiter' });
  }
});

/**
 * GET /api/employees/:id
 * Einzelner Mitarbeiter
 */
router.get('/:id', [
  param('id').isInt().withMessage('Ungültige ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const id = parseInt(req.params.id);
    
    const employee = await prisma.employee.findUnique({
      where: { id }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });
    }

    // Für Viewer: Namen maskieren
    if (isViewer(req.user)) {
      employee.name = `🔒 PN: ${employee.personalnummer}`;
    }

    // Gehalt berechnen
    const basisWochenstundenSetting = await prisma.setting.findUnique({
      where: { key: 'basis_wochenstunden' }
    });
    const basisWochenstunden = basisWochenstundenSetting 
      ? parseFloat(basisWochenstundenSetting.value) 
      : 40;

    const gehalt = berechneGehalt(employee, basisWochenstunden);

    res.json({ 
      employee: {
        ...employee,
        gehalt
      }
    });
  } catch (error) {
    console.error('Fehler bei GET /employees/:id:', error);
    res.status(500).json({ error: 'Serverfehler beim Laden des Mitarbeiters' });
  }
});

/**
 * POST /api/employees
 * Neuen Mitarbeiter erstellen (Admin/Editor)
 */
router.post('/', requireRole([ROLES.ADMIN, ROLES.EDITOR]), [
  body('personalnummer').trim().notEmpty().withMessage('Personalnummer erforderlich'),
  body('name').trim().notEmpty().withMessage('Name erforderlich'),
  body('eintrittsdatum').isISO8601().withMessage('Gültiges Eintrittsdatum erforderlich'),
  body('entgeltgruppe').trim().notEmpty().withMessage('Entgeltgruppe erforderlich'),
  body('stufe').isInt({ min: 1, max: 6 }).withMessage('Stufe muss zwischen 1 und 6 sein'),
  body('wochenstunden').isFloat({ min: 0 }).withMessage('Wochenstunden müssen positiv sein'),
  body('stundenlohn').isFloat({ min: 0 }).withMessage('Stundenlohn muss positiv sein')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      personalnummer,
      name,
      qualifikation,
      abteilung,
      eintrittsdatum,
      entgeltgruppe,
      stufe,
      wochenstunden,
      stundenlohn,
      zulagen
    } = req.body;

    // Prüfen ob Personalnummer bereits existiert
    const existing = await prisma.employee.findUnique({
      where: { personalnummer }
    });

    if (existing) {
      return res.status(400).json({ 
        error: 'Personalnummer existiert bereits',
        message: `Mitarbeiter mit PN ${personalnummer} bereits vorhanden`
      });
    }

    // Nächsten Aufstieg berechnen
    const naechsterAufstieg = berechneNaechstenAufstieg(new Date(eintrittsdatum), stufe);

    // Mitarbeiter erstellen
    const employee = await prisma.employee.create({
      data: {
        personalnummer,
        name,
        qualifikation,
        abteilung,
        eintrittsdatum: new Date(eintrittsdatum),
        entgeltgruppe,
        stufe: parseInt(stufe),
        naechsterAufstieg,
        wochenstunden: parseFloat(wochenstunden),
        stundenlohn: parseFloat(stundenlohn),
        zulagen: JSON.stringify(zulagen || {})
      }
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'EMPLOYEE_CREATED',
        details: JSON.stringify({ 
          personalnummer, 
          name,
          createdBy: req.user.username 
        })
      }
    });

    res.status(201).json({ 
      success: true, 
      employee,
      message: 'Mitarbeiter erfolgreich erstellt'
    });

  } catch (error) {
    console.error('Fehler bei POST /employees:', error);
    res.status(500).json({ error: 'Serverfehler beim Erstellen des Mitarbeiters' });
  }
});

/**
 * PUT /api/employees/:id
 * Mitarbeiter aktualisieren (Admin/Editor)
 */
router.put('/:id', requireRole([ROLES.ADMIN, ROLES.EDITOR]), [
  param('id').isInt().withMessage('Ungültige ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const id = parseInt(req.params.id);
    
    // Prüfen ob Mitarbeiter existiert
    const existing = await prisma.employee.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });
    }

    const {
      personalnummer,
      name,
      qualifikation,
      abteilung,
      eintrittsdatum,
      entgeltgruppe,
      stufe,
      wochenstunden,
      stundenlohn,
      zulagen,
      aktiv
    } = req.body;

    // Update-Daten vorbereiten
    const updateData = {};
    
    if (personalnummer !== undefined) updateData.personalnummer = personalnummer;
    if (name !== undefined) updateData.name = name;
    if (qualifikation !== undefined) updateData.qualifikation = qualifikation;
    if (abteilung !== undefined) updateData.abteilung = abteilung;
    if (eintrittsdatum !== undefined) updateData.eintrittsdatum = new Date(eintrittsdatum);
    if (entgeltgruppe !== undefined) updateData.entgeltgruppe = entgeltgruppe;
    if (stufe !== undefined) updateData.stufe = parseInt(stufe);
    if (wochenstunden !== undefined) updateData.wochenstunden = parseFloat(wochenstunden);
    if (stundenlohn !== undefined) updateData.stundenlohn = parseFloat(stundenlohn);
    if (zulagen !== undefined) updateData.zulagen = JSON.stringify(zulagen);
    if (aktiv !== undefined) updateData.aktiv = aktiv;

    // Nächsten Aufstieg neu berechnen wenn Stufe oder Eintrittsdatum geändert
    if (stufe !== undefined || eintrittsdatum !== undefined) {
      const eintritt = eintrittsdatum ? new Date(eintrittsdatum) : existing.eintrittsdatum;
      const currentStufe = stufe !== undefined ? parseInt(stufe) : existing.stufe;
      updateData.naechsterAufstieg = berechneNaechstenAufstieg(eintritt, currentStufe);
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'EMPLOYEE_UPDATED',
        details: JSON.stringify({ 
          id,
          personalnummer: employee.personalnummer,
          changes: Object.keys(updateData),
          updatedBy: req.user.username 
        })
      }
    });

    res.json({ 
      success: true, 
      employee,
      message: 'Mitarbeiter erfolgreich aktualisiert'
    });

  } catch (error) {
    console.error('Fehler bei PUT /employees/:id:', error);
    res.status(500).json({ error: 'Serverfehler beim Aktualisieren des Mitarbeiters' });
  }
});

/**
 * DELETE /api/employees/:id
 * Mitarbeiter deaktivieren (Soft-Delete) - Nur Admin
 */
router.delete('/:id', requireRole(ROLES.ADMIN), [
  param('id').isInt().withMessage('Ungültige ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const id = parseInt(req.params.id);
    const { hardDelete } = req.query;
    
    const existing = await prisma.employee.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });
    }

    if (hardDelete === 'true') {
      // Hartes Löschen - erst verknüpfte Notifications löschen
      const deletedNotifications = await prisma.notification.deleteMany({
        where: { employeeId: id }
      });

      // Dann Mitarbeiter löschen
      await prisma.employee.delete({
        where: { id }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'DELETE_EMPLOYEE',
          details: JSON.stringify({ 
            id,
            personalnummer: existing.personalnummer,
            name: existing.name,
            deletedNotifications: deletedNotifications.count,
            deletedBy: req.user.username 
          })
        }
      });

      res.json({ success: true, message: 'Mitarbeiter endgültig gelöscht' });
    } else {
      // Soft-Delete (Standard)
      await prisma.employee.update({
        where: { id },
        data: { aktiv: false }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'EMPLOYEE_DEACTIVATED',
          details: JSON.stringify({ 
            id,
            personalnummer: existing.personalnummer,
            deactivatedBy: req.user.username 
          })
        }
      });

      res.json({ success: true, message: 'Mitarbeiter deaktiviert' });
    }

  } catch (error) {
    console.error('Fehler bei DELETE /employees/:id:', error);
    res.status(500).json({ error: 'Serverfehler beim Löschen des Mitarbeiters' });
  }
});

/**
 * POST /api/employees/:id/reactivate
 * Mitarbeiter reaktivieren - Nur Admin
 */
router.post('/:id/reactivate', requireRole(ROLES.ADMIN), [
  param('id').isInt().withMessage('Ungültige ID')
], async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const employee = await prisma.employee.update({
      where: { id },
      data: { aktiv: true }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'EMPLOYEE_REACTIVATED',
        details: JSON.stringify({ 
          id,
          personalnummer: employee.personalnummer,
          reactivatedBy: req.user.username 
        })
      }
    });

    res.json({ success: true, employee, message: 'Mitarbeiter reaktiviert' });

  } catch (error) {
    console.error('Fehler bei POST /employees/:id/reactivate:', error);
    res.status(500).json({ error: 'Serverfehler beim Reaktivieren' });
  }
});

/**
 * GET /api/employees/departments/list
 * Liste aller Abteilungen
 */
router.get('/departments/list', async (req, res) => {
  try {
    const result = await prisma.employee.findMany({
      where: { aktiv: true },
      select: { abteilung: true },
      distinct: ['abteilung']
    });

    const departments = result
      .map(r => r.abteilung)
      .filter(Boolean)
      .sort();

    res.json({ departments });
  } catch (error) {
    console.error('Fehler bei GET /departments/list:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

module.exports = router;
