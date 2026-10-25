const User = require('../models/User');

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { name, email, phone, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Role is strictly locked to 'user' for public registration
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      password,
      role: 'user',
    });

    // Establish authenticated session
    req.session.userId = user._id;
    req.session.userRole = user.role;
    req.session.userName = user.name;

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to Saanjh.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Establish session
    req.session.userId = user._id;
    req.session.userRole = user.role;
    req.session.userName = user.name;

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/admin-login
async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator credentials.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator credentials.',
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This account does not possess administrator privileges.',
      });
    }

    // Establish admin session
    req.session.userId = user._id;
    req.session.userRole = user.role;
    req.session.userName = user.name;

    return res.json({
      success: true,
      message: `Administrator authenticated. Welcome, ${user.name}.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout
async function logout(req, res, next) {
  try {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Could not log out at this moment.',
        });
      }
      res.clearCookie('saanjh.sid');
      return res.json({
        success: true,
        message: 'Logged out successfully.',
      });
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function getCurrentUser(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return res.json({
        success: true,
        authenticated: false,
        user: null,
      });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.json({
        success: true,
        authenticated: false,
        user: null,
      });
    }

    return res.json({
      success: true,
      authenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  adminLogin,
  logout,
  getCurrentUser,
};
