/**
 * Auth Routes
 * Login, Logout, Session-Handling
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/auth/login
 * Login mit Username und Passwort
 */
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Benutzername erforderlich'),
  body('password').notEmpty().withMessage('Passwort erforderlich')
], async (req, res) => {
  try {
    // Validierung
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // User finden
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Anmeldung fehlgeschlagen',
        message: 'Benutzername oder Passwort falsch'
      });
    }

    // Prüfen ob User aktiv ist
    if (!user.active) {
      return res.status(401).json({ 
        error: 'Konto deaktiviert',
        message: 'Ihr Konto wurde deaktiviert. Bitte kontaktieren Sie den Administrator.'
      });
    }

    // Passwort prüfen
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      // Audit Log
      await prisma.auditLog.create({
        data: {
          action: 'LOGIN_FAILED',
          details: JSON.stringify({ username, reason: 'Falsches Passwort' })
        }
      });

      return res.status(401).json({ 
        error: 'Anmeldung fehlgeschlagen',
        message: 'Benutzername oder Passwort falsch'
      });
    }

    // Session erstellen
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      departmentAccess: user.departmentAccess
    };

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        details: JSON.stringify({ username: user.username })
      }
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login Fehler:', error);
    res.status(500).json({ error: 'Serverfehler bei Anmeldung' });
  }
});

/**
 * POST /api/auth/logout
 * Logout - Session beenden
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    // Audit Log
    if (userId) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'LOGOUT',
          details: JSON.stringify({ username: req.user.username })
        }
      });
    }

    // Session zerstören
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Fehler beim Logout' });
      }
      res.json({ success: true, message: 'Erfolgreich abgemeldet' });
    });

  } catch (error) {
    console.error('Logout Fehler:', error);
    res.status(500).json({ error: 'Serverfehler bei Abmeldung' });
  }
});

/**
 * GET /api/auth/me
 * Aktueller angemeldeter Benutzer
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        role: true,
        departmentAccess: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Fehler bei /me:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

/**
 * POST /api/auth/change-password
 * Passwort ändern
 */
router.post('/change-password', requireAuth, [
  body('currentPassword').notEmpty().withMessage('Aktuelles Passwort erforderlich'),
  body('newPassword').isLength({ min: 6 }).withMessage('Neues Passwort muss mind. 6 Zeichen haben')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // User mit aktuellem Passwort holen
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // Aktuelles Passwort prüfen
    const passwordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ 
        error: 'Passwortänderung fehlgeschlagen',
        message: 'Aktuelles Passwort ist falsch'
      });
    }

    // Neues Passwort hashen und speichern
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PASSWORD_CHANGED',
        details: JSON.stringify({ username: user.username })
      }
    });

    res.json({ success: true, message: 'Passwort erfolgreich geändert' });

  } catch (error) {
    console.error('Passwortänderung Fehler:', error);
    res.status(500).json({ error: 'Serverfehler bei Passwortänderung' });
  }
});

module.exports = router;
