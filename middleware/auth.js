const User = require('../models/User');

// Middleware to ensure user is logged in
async function isAuthenticated(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in to continue.',
    });
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        message: 'Account not found. Please log in again.',
      });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Session verification failed.',
    });
  }
}

// Middleware to ensure user is an administrator
async function isAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in as administrator.',
    });
  }

  if (req.session.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.',
    });
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Invalid administrator session.',
      });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed.',
    });
  }
}

// Optional auth helper: attaches user if session exists
async function attachUser(req, res, next) {
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
      if (user) req.user = user;
    } catch (e) {}
  }
  next();
}

module.exports = {
  isAuthenticated,
  isAdmin,
  attachUser,
};
