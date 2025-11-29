/**
 * Lohnmonitor Enterprise - Backend Server
 * Express.js API für Pflegedienst Lohnverwaltung
 * 
 * SECURITY NOTE: This application is designed for internal/intranet use only.
 * For internet-facing deployments, additional security measures like CSRF tokens
 * should be implemented. The current session-based auth uses:
 * - HttpOnly cookies (prevents XSS access to session)
 * - SameSite cookie attribute (provides CSRF protection in modern browsers)
 * - CORS restrictions (limits cross-origin requests)
 */

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const employeesRoutes = require('./routes/employees');
const dashboardRoutes = require('./routes/dashboard');
const pdfRoutes = require('./routes/pdf');
const adminRoutes = require('./routes/admin');

// Import services
const { initCronJobs } = require('./services/cronJobs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session-Konfiguration with SameSite for CSRF protection
app.use(session({
  secret: process.env.SESSION_SECRET || 'lohnmonitor-default-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax', // Provides basic CSRF protection
    maxAge: 24 * 60 * 60 * 1000 // 24 Stunden
  }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/admin', adminRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '3.0.0',
    timestamp: new Date().toISOString()
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    error: 'Interner Serverfehler',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route nicht gefunden' });
});

// Server starten
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║          LOHNMONITOR ENTERPRISE v3.0.0                      ║
║────────────────────────────────────────────────────────────║
║  Server läuft auf: http://localhost:${PORT}                    ║
║  API Health Check: http://localhost:${PORT}/api/health         ║
╚════════════════════════════════════════════════════════════╝
  `);

  // Cron-Jobs initialisieren
  if (process.env.ALARM_CHECK_ENABLED !== 'false') {
    initCronJobs();
  }
});

module.exports = app;
