const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { isAdmin } = require('../middleware/auth');

// Public: get website settings
router.get('/', settingsController.getSettings);

// Administrator: update settings
router.put('/', isAdmin, settingsController.updateSettings);

module.exports = router;
