const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../middleware/validation');

// Rate limiter for authentication endpoints: 30 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, registerValidation, authController.register);
router.post('/login', authLimiter, loginValidation, authController.login);
router.post('/admin-login', authLimiter, loginValidation, authController.adminLogin);
router.post('/logout', authController.logout);
router.get('/me', authController.getCurrentUser);

module.exports = router;
