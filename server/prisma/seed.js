/**
 * Datenbank Seed Script
 * Erstellt initiale Daten für die Anwendung
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin-Benutzer erstellen
  const adminPassword = await bcrypt.hash('password', 10);
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      role: 'Admin',
      active: true
    }
  });
  console.log('✅ Admin-Benutzer erstellt:', admin.username);

  // Viewer-Benutzer erstellen
  const viewerPassword = await bcrypt.hash('viewer123', 10);
  
  const viewer = await prisma.user.upsert({
    where: { username: 'viewer' },
    update: {},
    create: {
      username: 'viewer',
      passwordHash: viewerPassword,
      role: 'Viewer',
      active: true
    }
  });
  console.log('✅ Viewer-Benutzer erstellt:', viewer.username);

  // Standard-Einstellungen
  const defaultSettings = [
    { key: 'basis_wochenstunden', value: '40' },
    { key: 'alarm_days_threshold', value: '40' },
    { key: 'firma_name', value: 'Pflegedienst Muster GmbH' },
    { key: 'firma_adresse', value: 'Musterstraße 123, 12345 Musterstadt' }
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting
    });
  }
  console.log('✅ Standard-Einstellungen erstellt');

  // Beispiel-Mitarbeiter (optional - für Demo)
  const demoEmployees = [
    {
      personalnummer: '1001',
      name: 'Max Mustermann',
      qualifikation: 'Pflegefachkraft',
      abteilung: 'Pflege',
      eintrittsdatum: new Date('2020-03-15'),
      entgeltgruppe: 'E7',
      stufe: 3,
      wochenstunden: 38.5,
      stundenlohn: 18.50,
      zulagen: JSON.stringify({ gruppe: 50, schicht: 75, tl100: false, tl150: false })
    },
    {
      personalnummer: '1002',
      name: 'Erika Beispiel',
      qualifikation: 'Pflegehilfe',
      abteilung: 'Pflege',
      eintrittsdatum: new Date('2022-06-01'),
      entgeltgruppe: 'E5',
      stufe: 2,
      wochenstunden: 30,
      stundenlohn: 15.00,
      zulagen: JSON.stringify({ gruppe: 0, schicht: 50, tl100: false, tl150: false })
    },
    {
      personalnummer: '1003',
      name: 'Thomas Teamleiter',
      qualifikation: 'Pflegefachkraft',
      abteilung: 'Pflege',
      eintrittsdatum: new Date('2018-01-10'),
      entgeltgruppe: 'E8',
      stufe: 4,
      wochenstunden: 40,
      stundenlohn: 20.00,
      zulagen: JSON.stringify({ gruppe: 100, schicht: 100, tl100: false, tl150: true })
    },
    {
      personalnummer: '1004',
      name: 'Anna Aufstieg',
      qualifikation: 'Pflegefachkraft',
      abteilung: 'Ambulant',
      // Eintrittsdatum so setzen, dass Aufstieg in ca. 30 Tagen ist
      eintrittsdatum: new Date(Date.now() - (12 * 30 - 30) * 24 * 60 * 60 * 1000),
      entgeltgruppe: 'E6',
      stufe: 1,
      wochenstunden: 35,
      stundenlohn: 16.50,
      zulagen: JSON.stringify({ gruppe: 30, schicht: 0, tl100: true, tl150: false })
    }
  ];

  // Berechne naechster Aufstieg für jeden Mitarbeiter
  const { berechneNaechstenAufstieg } = require('../services/tarifCalculator');
  
  for (const emp of demoEmployees) {
    emp.naechsterAufstieg = berechneNaechstenAufstieg(emp.eintrittsdatum, emp.stufe);
    
    await prisma.employee.upsert({
      where: { personalnummer: emp.personalnummer },
      update: emp,
      create: emp
    });
  }
  console.log('✅ Demo-Mitarbeiter erstellt');

  // Audit Log für Seeding
  await prisma.auditLog.create({
    data: {
      action: 'DATABASE_SEEDED',
      details: JSON.stringify({ 
        users: 2,
        settings: defaultSettings.length,
        employees: demoEmployees.length
      })
    }
  });

  console.log('🎉 Seeding abgeschlossen!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
