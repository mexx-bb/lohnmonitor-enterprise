/**
 * Cron Jobs Service
 * Automatisierte tägliche Prüfungen für Stufenaufstiege
 */

const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { istAufstiegBevorstehend, berechneTagesBisAufstieg } = require('./tarifCalculator');
const { sendStufenaufstiegEmail } = require('./emailService');

const prisma = new PrismaClient();

/**
 * Prüft alle Mitarbeiter auf bevorstehende Stufenaufstiege
 */
async function checkStufenaufstiege() {
  console.log('⏰ Cron: Prüfe Stufenaufstiege...');

  try {
    // Hole Schwellenwert aus Settings (oder default 40 Tage)
    const schwellenwertSetting = await prisma.setting.findUnique({
      where: { key: 'alarm_days_threshold' }
    });
    const schwellenwertTage = schwellenwertSetting 
      ? parseInt(schwellenwertSetting.value) 
      : parseInt(process.env.ALARM_DAYS_THRESHOLD) || 40;

    // Hole alle aktiven Mitarbeiter mit bevorstehendem Aufstieg
    const mitarbeiter = await prisma.employee.findMany({
      where: {
        aktiv: true,
        naechsterAufstieg: { not: null }
      }
    });

    let benachrichtigungenGesendet = 0;

    for (const ma of mitarbeiter) {
      if (istAufstiegBevorstehend(ma.naechsterAufstieg, schwellenwertTage)) {
        // Prüfe ob bereits eine unbestätigte Benachrichtigung existiert
        const existingNotification = await prisma.notification.findFirst({
          where: {
            employeeId: ma.id,
            type: 'stufenaufstieg',
            acknowledged: false,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Letzte 7 Tage
            }
          }
        });

        if (!existingNotification) {
          const tageBis = berechneTagesBisAufstieg(ma.naechsterAufstieg);
          
          // Erstelle Benachrichtigung
          await prisma.notification.create({
            data: {
              employeeId: ma.id,
              type: 'stufenaufstieg',
              message: `Stufenaufstieg in ${tageBis} Tagen: ${ma.name} -> Stufe ${ma.stufe + 1}`
            }
          });

          // Sende E-Mail wenn aktiviert
          if (process.env.SMTP_ENABLED === 'true') {
            const result = await sendStufenaufstiegEmail(ma, ma.naechsterAufstieg);
            
            if (result.success) {
              // Update Notification als gesendet
              await prisma.notification.updateMany({
                where: {
                  employeeId: ma.id,
                  type: 'stufenaufstieg',
                  sent: false
                },
                data: {
                  sent: true,
                  sentAt: new Date()
                }
              });
              benachrichtigungenGesendet++;
            }
          }

          console.log(`📧 Alarm: ${ma.name} - Aufstieg in ${tageBis} Tagen`);
        }
      }
    }

    console.log(`⏰ Cron: ${benachrichtigungenGesendet} E-Mail(s) gesendet`);
    return { success: true, benachrichtigungenGesendet };
  } catch (error) {
    console.error('⏰ Cron Fehler:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initialisiert die Cron-Jobs
 */
function initCronJobs() {
  console.log('⏰ Cron Jobs werden initialisiert...');

  // Täglich um 8:00 Uhr prüfen
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Cron: Tägliche Stufenaufstieg-Prüfung gestartet');
    await checkStufenaufstiege();
  });

  // Optional: Auch bei Serverstart prüfen (verzögert)
  setTimeout(async () => {
    if (process.env.NODE_ENV !== 'test') {
      console.log('⏰ Cron: Initiale Prüfung bei Serverstart...');
      await checkStufenaufstiege();
    }
  }, 5000);

  console.log('⏰ Cron Jobs aktiv: Tägliche Prüfung um 08:00 Uhr');
}

module.exports = {
  checkStufenaufstiege,
  initCronJobs
};
