const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { isAdmin } = require('../middleware/auth');
const { menuItemValidation } = require('../middleware/validation');

// Public: view menu
router.get('/', menuController.getAllMenuItems);
router.get('/:id', menuController.getMenuItemById);

// Administrator: manage menu
router.post('/', isAdmin, menuItemValidation, menuController.createMenuItem);
router.put('/:id', isAdmin, menuController.updateMenuItem);
router.delete('/:id', isAdmin, menuController.deleteMenuItem);

module.exports = router;
