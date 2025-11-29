/**
 * Authentifizierungs-Middleware
 * Prüft ob der Benutzer eingeloggt ist
 */

/**
 * Prüft ob eine gültige Session existiert
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ 
      error: 'Nicht autorisiert',
      message: 'Bitte melden Sie sich an'
    });
  }

  // User-Daten an Request anhängen
  req.user = req.session.user;
  next();
}

/**
 * Optionale Auth - erlaubt auch ohne Login, aber fügt User hinzu wenn vorhanden
 */
function optionalAuth(req, res, next) {
  if (req.session && req.session.user) {
    req.user = req.session.user;
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth
};
