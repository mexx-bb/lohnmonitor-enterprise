/**
 * Rollen-Prüfungs-Middleware
 * Prüft ob der Benutzer die erforderliche Rolle hat
 */

const ROLES = {
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  VIEWER: 'Viewer'
};

// Rollen-Hierarchie: Admin > Editor > Viewer
const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 3,
  [ROLES.EDITOR]: 2,
  [ROLES.VIEWER]: 1
};

/**
 * Factory für Rollen-Check Middleware
 * @param {string|string[]} allowedRoles - Erlaubte Rollen
 */
function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Nicht autorisiert',
        message: 'Bitte melden Sie sich an'
      });
    }

    const userRole = req.user.role;

    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Zugriff verweigert',
        message: 'Sie haben nicht die erforderlichen Berechtigungen'
      });
    }

    next();
  };
}

/**
 * Prüft ob der User mindestens die angegebene Rolle hat
 * (Berücksichtigt Hierarchie)
 */
function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Nicht autorisiert',
        message: 'Bitte melden Sie sich an'
      });
    }

    const userRoleLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const minRoleLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userRoleLevel < minRoleLevel) {
      return res.status(403).json({ 
        error: 'Zugriff verweigert',
        message: 'Sie haben nicht die erforderlichen Berechtigungen'
      });
    }

    next();
  };
}

/**
 * Nur Admin-Zugriff
 */
function requireAdmin(req, res, next) {
  return requireRole(ROLES.ADMIN)(req, res, next);
}

/**
 * Admin oder Editor
 */
function requireEditor(req, res, next) {
  return requireRole([ROLES.ADMIN, ROLES.EDITOR])(req, res, next);
}

/**
 * Prüft ob User auf die Abteilung zugreifen darf
 */
function requireDepartmentAccess(abteilung) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }

    // Admins haben immer Zugriff
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    // Prüfe Abteilungszugriff
    const allowedDepartments = req.user.departmentAccess 
      ? req.user.departmentAccess.split(',').map(d => d.trim())
      : [];

    if (allowedDepartments.length > 0 && !allowedDepartments.includes(abteilung)) {
      return res.status(403).json({ 
        error: 'Zugriff verweigert',
        message: 'Sie haben keinen Zugriff auf diese Abteilung'
      });
    }

    next();
  };
}

/**
 * Hilfsfunktion: Prüft ob User Admin ist
 */
function isAdmin(user) {
  return user && user.role === ROLES.ADMIN;
}

/**
 * Hilfsfunktion: Prüft ob User mindestens Editor ist
 */
function isEditor(user) {
  return user && (user.role === ROLES.ADMIN || user.role === ROLES.EDITOR);
}

/**
 * Hilfsfunktion: Prüft ob User nur Viewer ist
 */
function isViewer(user) {
  return user && user.role === ROLES.VIEWER;
}

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  requireRole,
  requireMinRole,
  requireAdmin,
  requireEditor,
  requireDepartmentAccess,
  isAdmin,
  isEditor,
  isViewer
};
