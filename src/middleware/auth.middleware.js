// src/middleware/auth.middleware.js

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'You must be logged in.' });
  }
  next(); // logged in — let the request continue
}

function requireRole(...allowedRoles) {
  // this returns a middleware function, so you can call requireRole('admin')
  // or requireRole('organiser', 'admin') depending on the route
  return (req, res, next) => {
    if (!allowedRoles.includes(req.session.role)) {
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };