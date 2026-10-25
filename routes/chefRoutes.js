const express = require('express');
const router = express.Router();
const chefController = require('../controllers/chefController');
const { isAdmin } = require('../middleware/auth');
const { chefValidation } = require('../middleware/validation');

// Public: view chefs
router.get('/', chefController.getAllChefs);
router.get('/:id', chefController.getChefById);

// Administrator: manage chefs
router.post('/', isAdmin, chefValidation, chefController.createChef);
router.put('/:id', isAdmin, chefController.updateChef);
router.delete('/:id', isAdmin, chefController.deleteChef);

module.exports = router;
