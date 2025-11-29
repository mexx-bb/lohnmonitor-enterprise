/**
 * PDF Routes
 * PDF-Generierung für Stufenaufstieg-Briefe
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const PdfPrinter = require('pdfmake');
const { requireAuth } = require('../middleware/auth');
const { requireRole, ROLES } = require('../middleware/roleCheck');
const { berechneGehalt, formatWaehrung } = require('../services/salaryCalculator');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Sanitizes a filename by removing or replacing potentially dangerous characters
 * Prevents directory traversal and handles special characters including German umlauts
 */
function sanitizeFilename(filename) {
  if (!filename) return 'unbekannt';
  
  return filename
    .replace(/[/\\?%*:|"<>]/g, '') // Remove filesystem-dangerous chars
    .replace(/\.\./g, '') // Prevent directory traversal
    .replace(/\s+/g, '_') // Replace whitespace with underscore
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .substring(0, 100); // Limit length
}

// PDF Fonts definieren
const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};

const printer = new PdfPrinter(fonts);

router.use(requireAuth);

/**
 * GET /api/pdf/stufenaufstieg/:employeeId
 * Generiert PDF-Brief für Stufenaufstieg
 * 
 * SECURITY NOTE: The employeeId in the URL is an internal database ID, not sensitive data.
 * The route is protected by authentication (requireAuth) and role authorization (ADMIN/EDITOR).
 * GET method is appropriate for document downloads per REST conventions.
 */
router.get('/stufenaufstieg/:employeeId', 
  requireRole([ROLES.ADMIN, ROLES.EDITOR]), 
  async (req, res) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      
      // Validate employeeId is a positive integer
      if (isNaN(employeeId) || employeeId <= 0) {
        return res.status(400).json({ error: 'Ungültige Mitarbeiter-ID' });
      }
      
      // Mitarbeiter laden
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId }
      });

      if (!employee) {
        return res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });
      }

      // Basis Wochenstunden aus Settings
      const basisWochenstundenSetting = await prisma.setting.findUnique({
        where: { key: 'basis_wochenstunden' }
      });
      const basisWochenstunden = basisWochenstundenSetting 
        ? parseFloat(basisWochenstundenSetting.value) 
        : 40;

      // Firmenname aus Settings (company_name für Anzeige, firma_name als Fallback)
      const companyName = await prisma.setting.findUnique({
        where: { key: 'company_name' }
      });
      const firmaName = await prisma.setting.findUnique({
        where: { key: 'firma_name' }
      });
      const displayCompanyName = companyName?.value || firmaName?.value || 'Lohnmonitor';

      // Gehalt berechnen
      const gehalt = berechneGehalt(employee, basisWochenstunden);

      // Datums-Formatierung
      const heute = new Date();
      const heuteStr = heute.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      const aufstiegsdatum = employee.naechsterAufstieg 
        ? new Date(employee.naechsterAufstieg).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
        : 'Nicht festgelegt';

      // PDF-Dokument Definition
      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [60, 60, 60, 60],
        
        content: [
          // Header
          {
            columns: [
              {
                text: displayCompanyName,
                style: 'header'
              },
              {
                text: heuteStr,
                alignment: 'right',
                margin: [0, 5, 0, 0]
              }
            ]
          },
          
          { text: '', margin: [0, 30] },
          
          // Empfänger
          {
            text: [
              `${employee.name}\n`,
              `Personalnummer: ${employee.personalnummer}\n`,
              employee.abteilung ? `Abteilung: ${employee.abteilung}` : ''
            ],
            style: 'address'
          },
          
          { text: '', margin: [0, 30] },
          
          // Betreff
          {
            text: 'Mitteilung über Stufenaufstieg',
            style: 'subject'
          },
          
          { text: '', margin: [0, 20] },
          
          // Anrede
          {
            text: `Sehr geehrte/r ${employee.name},`,
            margin: [0, 0, 0, 15]
          },
          
          // Haupttext
          {
            text: [
              'wir freuen uns, Ihnen mitzuteilen, dass gemäß der geltenden Tarifvereinbarung (AVR Bayern) ein ',
              'Stufenaufstieg für Sie vorgesehen ist.\n\n'
            ]
          },
          
          // Stufeninfo Box
          {
            table: {
              widths: ['*'],
              body: [
                [{
                  fillColor: '#f0f4f8',
                  border: [true, true, true, true],
                  margin: [10, 10, 10, 10],
                  text: [
                    { text: 'Stufenaufstieg\n', style: 'tableHeader' },
                    { text: '\n' },
                    { text: `Aktuelle Stufe: `, bold: true },
                    `${employee.stufe}\n`,
                    { text: `Neue Stufe: `, bold: true },
                    `${employee.stufe + 1}\n`,
                    { text: `Datum des Aufstiegs: `, bold: true },
                    `${aufstiegsdatum}\n`,
                    { text: `Entgeltgruppe: `, bold: true },
                    `${employee.entgeltgruppe}`
                  ]
                }]
              ]
            },
            margin: [0, 10, 0, 20]
          },
          
          // Gehaltsübersicht
          {
            text: 'Gehaltsübersicht (aktuell)',
            style: 'sectionHeader'
          },
          
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto'],
              body: [
                [
                  { text: 'Position', style: 'tableHeader' },
                  { text: 'Betrag', style: 'tableHeader', alignment: 'right' }
                ],
                ['Wochenstunden', { text: `${gehalt.wochenstunden} Std.`, alignment: 'right' }],
                ['Monatsstunden', { text: `${gehalt.monatsstunden} Std.`, alignment: 'right' }],
                ['Stundenlohn', { text: formatWaehrung(gehalt.stundenlohn), alignment: 'right' }],
                ['Basis-Brutto', { text: formatWaehrung(gehalt.basisBrutto), alignment: 'right' }],
                [{ text: 'Zulagen', colSpan: 2, style: 'tableSubHeader' }, {}],
                ['  Gruppen-Zulage', { text: formatWaehrung(gehalt.zulagen.gruppeZulage), alignment: 'right' }],
                ['  Schicht-Zulage', { text: formatWaehrung(gehalt.zulagen.schichtZulage), alignment: 'right' }],
                ['  TL 100€', { text: formatWaehrung(gehalt.zulagen.tl100), alignment: 'right' }],
                ['  TL 150€', { text: formatWaehrung(gehalt.zulagen.tl150), alignment: 'right' }],
                [
                  { text: 'Gesamt-Brutto', bold: true },
                  { text: formatWaehrung(gehalt.gesamtBrutto), bold: true, alignment: 'right' }
                ]
              ]
            },
            margin: [0, 10, 0, 20]
          },
          
          // Schlusstext
          {
            text: [
              'Mit dem Stufenaufstieg verbunden ist in der Regel eine Anpassung Ihres Gehalts ',
              'gemäß der aktuellen Tariftabelle. Die genauen Beträge entnehmen Sie bitte Ihrer ',
              'nächsten Gehaltsabrechnung.\n\n',
              'Bei Rückfragen stehen wir Ihnen gerne zur Verfügung.\n\n'
            ]
          },
          
          // Grußformel
          {
            text: [
              'Mit freundlichen Grüßen\n\n\n',
              '_______________________\n',
              'Personalabteilung'
            ],
            margin: [0, 20, 0, 0]
          }
        ],
        
        styles: {
          header: {
            fontSize: 16,
            bold: true,
            color: '#0066cc'
          },
          address: {
            fontSize: 11
          },
          subject: {
            fontSize: 14,
            bold: true
          },
          sectionHeader: {
            fontSize: 12,
            bold: true,
            margin: [0, 10, 0, 5]
          },
          tableHeader: {
            bold: true,
            fillColor: '#0066cc',
            color: 'white'
          },
          tableSubHeader: {
            bold: true,
            fillColor: '#e8e8e8'
          }
        },
        
        defaultStyle: {
          fontSize: 10
        }
      };

      // PDF generieren
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      
      // Response Headers with sanitized filename
      const safeName = sanitizeFilename(employee.name);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition', 
        `attachment; filename="Stufenaufstieg_${employee.personalnummer}_${safeName}.pdf"`
      );

      // PDF streamen
      pdfDoc.pipe(res);
      pdfDoc.end();

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'PDF_GENERATED',
          details: JSON.stringify({ 
            type: 'stufenaufstieg',
            employeeId,
            personalnummer: employee.personalnummer,
            generatedBy: req.user.username 
          })
        }
      });

    } catch (error) {
      console.error('Fehler bei PDF-Generierung:', error);
      res.status(500).json({ error: 'Fehler bei PDF-Generierung' });
    }
  }
);

/**
 * GET /api/pdf/gehaltsnachweis/:employeeId
 * Generiert PDF mit Gehaltsnachweis
 * 
 * SECURITY NOTE: Protected by authentication and role authorization.
 * employeeId is an internal ID, not sensitive data.
 */
router.get('/gehaltsnachweis/:employeeId', 
  requireRole([ROLES.ADMIN, ROLES.EDITOR]), 
  async (req, res) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      
      // Validate employeeId
      if (isNaN(employeeId) || employeeId <= 0) {
        return res.status(400).json({ error: 'Ungültige Mitarbeiter-ID' });
      }
      
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId }
      });

      if (!employee) {
        return res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });
      }

      // Basis Wochenstunden
      const basisWochenstundenSetting = await prisma.setting.findUnique({
        where: { key: 'basis_wochenstunden' }
      });
      const basisWochenstunden = basisWochenstundenSetting 
        ? parseFloat(basisWochenstundenSetting.value) 
        : 40;

      const gehalt = berechneGehalt(employee, basisWochenstunden);

      const heute = new Date().toLocaleDateString('de-DE');

      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [60, 60, 60, 60],
        
        content: [
          {
            text: 'Gehaltsnachweis',
            style: 'header'
          },
          
          { text: '', margin: [0, 20] },
          
          {
            table: {
              widths: ['auto', '*'],
              body: [
                [{ text: 'Mitarbeiter:', bold: true }, employee.name],
                [{ text: 'Personalnummer:', bold: true }, employee.personalnummer],
                [{ text: 'Abteilung:', bold: true }, employee.abteilung || '-'],
                [{ text: 'Entgeltgruppe:', bold: true }, employee.entgeltgruppe],
                [{ text: 'Stufe:', bold: true }, employee.stufe.toString()],
                [{ text: 'Datum:', bold: true }, heute]
              ]
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 20]
          },
          
          {
            text: 'Gehaltsberechnung',
            style: 'sectionHeader'
          },
          
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto'],
              body: [
                [
                  { text: 'Position', style: 'tableHeader' },
                  { text: 'Betrag', style: 'tableHeader', alignment: 'right' }
                ],
                ['Wochenstunden', { text: `${gehalt.wochenstunden} Std.`, alignment: 'right' }],
                ['Monatsstunden (×4,348)', { text: `${gehalt.monatsstunden} Std.`, alignment: 'right' }],
                ['Stundenlohn', { text: formatWaehrung(gehalt.stundenlohn), alignment: 'right' }],
                ['Basis-Brutto', { text: formatWaehrung(gehalt.basisBrutto), alignment: 'right' }],
                [{ text: '', colSpan: 2 }, {}],
                [{ text: 'Zulagen', style: 'tableSubHeader', colSpan: 2 }, {}],
                ['Gruppen-Zulage (anteilig)', { text: formatWaehrung(gehalt.zulagen.gruppeZulage), alignment: 'right' }],
                ['Schicht-Zulage (anteilig)', { text: formatWaehrung(gehalt.zulagen.schichtZulage), alignment: 'right' }],
                ['Teamleiter-Zulage 100€', { text: formatWaehrung(gehalt.zulagen.tl100), alignment: 'right' }],
                ['Teamleiter-Zulage 150€', { text: formatWaehrung(gehalt.zulagen.tl150), alignment: 'right' }],
                ['Zulagen Gesamt', { text: formatWaehrung(gehalt.zulagen.gesamt), alignment: 'right' }],
                [{ text: '', colSpan: 2 }, {}],
                [
                  { text: 'GESAMT-BRUTTO', bold: true, fontSize: 12 },
                  { text: formatWaehrung(gehalt.gesamtBrutto), bold: true, fontSize: 12, alignment: 'right' }
                ]
              ]
            },
            margin: [0, 10, 0, 30]
          },
          
          {
            text: 'Berechnungshinweise:',
            style: 'sectionHeader'
          },
          
          {
            ul: [
              'Monatsstunden = Wochenstunden × 4,348 (Durchschnitt)',
              'Basis-Brutto = Monatsstunden × Stundenlohn',
              `Variable Zulagen = (Wochenstunden / ${basisWochenstunden}) × Zulagenwert`,
              'TL-Zulagen sind Pauschalen (100€ oder 150€)'
            ],
            margin: [0, 5, 0, 0]
          }
        ],
        
        styles: {
          header: {
            fontSize: 18,
            bold: true,
            alignment: 'center',
            color: '#0066cc'
          },
          sectionHeader: {
            fontSize: 12,
            bold: true,
            margin: [0, 10, 0, 5]
          },
          tableHeader: {
            bold: true,
            fillColor: '#0066cc',
            color: 'white'
          },
          tableSubHeader: {
            bold: true,
            fillColor: '#e8e8e8'
          }
        },
        
        defaultStyle: {
          fontSize: 10
        }
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition', 
        `attachment; filename="Gehaltsnachweis_${employee.personalnummer}.pdf"`
      );

      pdfDoc.pipe(res);
      pdfDoc.end();

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'PDF_GENERATED',
          details: JSON.stringify({ 
            type: 'gehaltsnachweis',
            employeeId,
            generatedBy: req.user.username 
          })
        }
      });

    } catch (error) {
      console.error('Fehler bei PDF-Generierung:', error);
      res.status(500).json({ error: 'Fehler bei PDF-Generierung' });
    }
  }
);

module.exports = router;
