/**
 * Dashboard Routes
 * Alarme, Übersicht, Stufenaufstiege
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');
const { requireRole, isViewer, ROLES } = require('../middleware/roleCheck');
const { bestimmeAlarmStatus, berechneTagesBisAufstieg } = require('../services/tarifCalculator');
const { berechneGehalt } = require('../services/salaryCalculator');

const router = express.Router();
const prisma = new PrismaClient();

router.use(requireAuth);

/**
 * GET /api/dashboard/summary
 * Übersicht mit Statistiken
 */
router.get('/summary', async (req, res) => {
  try {
    // Zähle Mitarbeiter
    const totalEmployees = await prisma.employee.count({
      where: { aktiv: true }
    });

    const inactiveEmployees = await prisma.employee.count({
      where: { aktiv: false }
    });

    // Hole Schwellenwert
    const schwellenwertSetting = await prisma.setting.findUnique({
      where: { key: 'alarm_days_threshold' }
    });
    const schwellenwertTage = schwellenwertSetting 
      ? parseInt(schwellenwertSetting.value) 
      : parseInt(process.env.ALARM_DAYS_THRESHOLD) || 40;

    // Zähle Alarme (Aufstiege <= Schwellenwert)
    const employeesWithUpcoming = await prisma.employee.findMany({
      where: { 
        aktiv: true,
        naechsterAufstieg: { not: null }
      },
      select: { naechsterAufstieg: true }
    });

    let alarmsCount = 0;
    for (const emp of employeesWithUpcoming) {
      const status = bestimmeAlarmStatus(emp.naechsterAufstieg, schwellenwertTage);
      if (status.alarm) alarmsCount++;
    }

    // Unbestätigte Benachrichtigungen
    const unacknowledgedNotifications = await prisma.notification.count({
      where: { acknowledged: false }
    });

    // Abteilungen
    const departments = await prisma.employee.findMany({
      where: { aktiv: true },
      select: { abteilung: true },
      distinct: ['abteilung']
    });

    res.json({
      summary: {
        totalEmployees,
        inactiveEmployees,
        alarmsCount,
        unacknowledgedNotifications,
        departmentsCount: departments.filter(d => d.abteilung).length,
        schwellenwertTage
      }
    });

  } catch (error) {
    console.error('Fehler bei GET /dashboard/summary:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

/**
 * GET /api/dashboard/alarms
 * Liste aller Alarme (Stufenaufstiege <= 40 Tage)
 */
router.get('/alarms', async (req, res) => {
  try {
    // Hole Schwellenwert
    const schwellenwertSetting = await prisma.setting.findUnique({
      where: { key: 'alarm_days_threshold' }
    });
    const schwellenwertTage = schwellenwertSetting 
      ? parseInt(schwellenwertSetting.value) 
      : parseInt(process.env.ALARM_DAYS_THRESHOLD) || 40;

    // Basis Wochenstunden
    const basisWochenstundenSetting = await prisma.setting.findUnique({
      where: { key: 'basis_wochenstunden' }
    });
    const basisWochenstunden = basisWochenstundenSetting 
      ? parseFloat(basisWochenstundenSetting.value) 
      : 40;

    // Alle aktiven Mitarbeiter mit Aufstiegsdatum
    const employees = await prisma.employee.findMany({
      where: { 
        aktiv: true,
        naechsterAufstieg: { not: null }
      },
      orderBy: { naechsterAufstieg: 'asc' }
    });

    // Viewer-Check
    const isViewerUser = isViewer(req.user);

    // Alarme filtern und anreichern
    const alarms = [];
    for (const emp of employees) {
      const status = bestimmeAlarmStatus(emp.naechsterAufstieg, schwellenwertTage);
      
      if (status.alarm || status.level !== 'gruen') {
        // Prüfe ob bereits bestätigt
        const notification = await prisma.notification.findFirst({
          where: {
            employeeId: emp.id,
            type: 'stufenaufstieg',
            acknowledged: true,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Letzte 30 Tage
            }
          }
        });

        const gehalt = berechneGehalt(emp, basisWochenstunden);

        alarms.push({
          id: emp.id,
          personalnummer: emp.personalnummer,
          name: isViewerUser ? `🔒 PN: ${emp.personalnummer}` : emp.name,
          abteilung: emp.abteilung,
          aktuelleStufe: emp.stufe,
          naechsteStufe: emp.stufe + 1,
          naechsterAufstieg: emp.naechsterAufstieg,
          tageBisAufstieg: status.tageBisAufstieg,
          alarmLevel: status.level,
          istBestaetigt: !!notification,
          bestaetigtAm: notification?.acknowledgedAt,
          bestaetigtVon: notification?.acknowledgedBy,
          gehalt
        });
      }
    }

    res.json({ 
      alarms,
      schwellenwertTage
    });

  } catch (error) {
    console.error('Fehler bei GET /dashboard/alarms:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

/**
 * POST /api/dashboard/alarms/:employeeId/acknowledge
 * Alarm als bearbeitet markieren (nur Admin/Editor)
 */
router.post('/alarms/:employeeId/acknowledge', 
  requireRole([ROLES.ADMIN, ROLES.EDITOR]), 
  async (req, res) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      
      // Prüfe ob Mitarbeiter existiert
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId }
      });

      if (!employee) {
        return res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });
      }

      // Finde oder erstelle Notification
      let notification = await prisma.notification.findFirst({
        where: {
          employeeId,
          type: 'stufenaufstieg',
          acknowledged: false
        }
      });

      if (!notification) {
        // Erstelle neue Notification
        notification = await prisma.notification.create({
          data: {
            employeeId,
            type: 'stufenaufstieg',
            message: `Stufenaufstieg bestätigt: ${employee.name}`,
            acknowledged: true,
            acknowledgedAt: new Date(),
            acknowledgedBy: req.user.username
          }
        });
      } else {
        // Update existierende
        notification = await prisma.notification.update({
          where: { id: notification.id },
          data: {
            acknowledged: true,
            acknowledgedAt: new Date(),
            acknowledgedBy: req.user.username
          }
        });
      }

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'ALARM_ACKNOWLEDGED',
          details: JSON.stringify({ 
            employeeId,
            personalnummer: employee.personalnummer,
            acknowledgedBy: req.user.username 
          })
        }
      });

      res.json({ 
        success: true, 
        message: 'Alarm als bearbeitet markiert',
        notification 
      });

    } catch (error) {
      console.error('Fehler bei POST /alarms/:id/acknowledge:', error);
      res.status(500).json({ error: 'Serverfehler' });
    }
  }
);

/**
 * GET /api/dashboard/notifications
 * Alle Benachrichtigungen
 */
router.get('/notifications', async (req, res) => {
  try {
    const { unacknowledgedOnly } = req.query;
    
    const where = {};
    if (unacknowledgedOnly === 'true') {
      where.acknowledged = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        employee: {
          select: {
            personalnummer: true,
            name: true,
            abteilung: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Viewer-Maskierung
    const isViewerUser = isViewer(req.user);
    const result = notifications.map(n => ({
      ...n,
      employee: {
        ...n.employee,
        name: isViewerUser ? `🔒 PN: ${n.employee.personalnummer}` : n.employee.name
      }
    }));

    res.json({ notifications: result });

  } catch (error) {
    console.error('Fehler bei GET /dashboard/notifications:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

/**
 * GET /api/dashboard/statistics
 * Erweiterte Statistiken
 */
router.get('/statistics', async (req, res) => {
  try {
    // Mitarbeiter nach Entgeltgruppe
    const byEntgeltgruppe = await prisma.employee.groupBy({
      by: ['entgeltgruppe'],
      where: { aktiv: true },
      _count: true
    });

    // Mitarbeiter nach Abteilung
    const byAbteilung = await prisma.employee.groupBy({
      by: ['abteilung'],
      where: { aktiv: true },
      _count: true
    });

    // Mitarbeiter nach Stufe
    const byStufe = await prisma.employee.groupBy({
      by: ['stufe'],
      where: { aktiv: true },
      _count: true
    });

    // Durchschnittswerte
    const averages = await prisma.employee.aggregate({
      where: { aktiv: true },
      _avg: {
        wochenstunden: true,
        stundenlohn: true
      }
    });

    res.json({
      statistics: {
        byEntgeltgruppe: byEntgeltgruppe.map(g => ({
          gruppe: g.entgeltgruppe,
          count: g._count
        })),
        byAbteilung: byAbteilung.map(a => ({
          abteilung: a.abteilung || 'Keine Abteilung',
          count: a._count
        })),
        byStufe: byStufe.map(s => ({
          stufe: s.stufe,
          count: s._count
        })),
        averages: {
          wochenstunden: Math.round(averages._avg.wochenstunden * 10) / 10,
          stundenlohn: Math.round(averages._avg.stundenlohn * 100) / 100
        }
      }
    });

  } catch (error) {
    console.error('Fehler bei GET /dashboard/statistics:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

module.exports = router;
