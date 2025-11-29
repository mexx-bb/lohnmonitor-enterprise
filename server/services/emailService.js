/**
 * E-Mail Service
 * Versand von Benachrichtigungen via SMTP
 */

const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Initialisiert den E-Mail-Transporter
 */
function initTransporter() {
  if (process.env.SMTP_ENABLED !== 'true') {
    console.log('📧 E-Mail Service: SMTP deaktiviert');
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    console.log('📧 E-Mail Service: SMTP konfiguriert');
    return transporter;
  } catch (error) {
    console.error('📧 E-Mail Service: Fehler bei Konfiguration:', error.message);
    return null;
  }
}

/**
 * Sendet eine E-Mail
 * @param {Object} options - { to, subject, text, html }
 */
async function sendEmail(options) {
  if (!transporter) {
    transporter = initTransporter();
  }

  if (!transporter) {
    console.log('📧 E-Mail nicht gesendet (SMTP deaktiviert)');
    return { success: false, reason: 'SMTP deaktiviert' };
  }

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'Lohnmonitor <noreply@company.de>',
      to: options.to || process.env.SMTP_TO,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 E-Mail gesendet:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('📧 E-Mail Fehler:', error.message);
    return { success: false, reason: error.message };
  }
}

/**
 * Sendet eine Stufenaufstieg-Benachrichtigung
 */
async function sendStufenaufstiegEmail(mitarbeiter, aufstiegsdatum) {
  const datum = new Date(aufstiegsdatum).toLocaleDateString('de-DE');
  
  const subject = `[Lohnmonitor] Stufenaufstieg: ${mitarbeiter.name}`;
  
  const text = `
Sehr geehrte Personalabteilung,

für folgenden Mitarbeiter steht ein Stufenaufstieg an:

Name: ${mitarbeiter.name}
Personalnummer: ${mitarbeiter.personalnummer}
Aktuelle Stufe: ${mitarbeiter.stufe}
Nächste Stufe: ${mitarbeiter.stufe + 1}
Aufstiegsdatum: ${datum}

Bitte leiten Sie die notwendigen Schritte ein.

Mit freundlichen Grüßen
Ihr Lohnmonitor System
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0066cc; color: white; padding: 15px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #0066cc; }
    .label { font-weight: bold; color: #666; }
    .value { color: #333; }
    .footer { text-align: center; padding: 10px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🔔 Stufenaufstieg Benachrichtigung</h2>
    </div>
    <div class="content">
      <p>Sehr geehrte Personalabteilung,</p>
      <p>für folgenden Mitarbeiter steht ein Stufenaufstieg an:</p>
      
      <div class="info-box">
        <p><span class="label">Name:</span> <span class="value">${mitarbeiter.name}</span></p>
        <p><span class="label">Personalnummer:</span> <span class="value">${mitarbeiter.personalnummer}</span></p>
        <p><span class="label">Aktuelle Stufe:</span> <span class="value">${mitarbeiter.stufe}</span></p>
        <p><span class="label">Nächste Stufe:</span> <span class="value">${mitarbeiter.stufe + 1}</span></p>
        <p><span class="label">Aufstiegsdatum:</span> <span class="value">${datum}</span></p>
      </div>
      
      <p>Bitte leiten Sie die notwendigen Schritte ein.</p>
      <p>Mit freundlichen Grüßen<br>Ihr Lohnmonitor System</p>
    </div>
    <div class="footer">
      Diese E-Mail wurde automatisch generiert.
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({ subject, text, html });
}

/**
 * Testet die SMTP-Verbindung
 */
async function testConnection() {
  if (!transporter) {
    transporter = initTransporter();
  }

  if (!transporter) {
    return { success: false, reason: 'SMTP deaktiviert' };
  }

  try {
    await transporter.verify();
    return { success: true };
  } catch (error) {
    return { success: false, reason: error.message };
  }
}

module.exports = {
  initTransporter,
  sendEmail,
  sendStufenaufstiegEmail,
  testConnection
};
