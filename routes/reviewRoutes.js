const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { reviewValidation } = require('../middleware/validation');

// Public: view published reviews
router.get('/', reviewController.getPublishedReviews);

// Authenticated users only: create, edit, delete reviews
router.post('/', isAuthenticated, reviewValidation, reviewController.createReview);
router.put('/:id', isAuthenticated, reviewController.updateReview);
router.delete('/:id', isAuthenticated, reviewController.deleteReview);

// Administrator: view all reviews
router.get('/admin/all', isAdmin, reviewController.getAllReviewsAdmin);

module.exports = router;
