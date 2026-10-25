const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { reservationValidation } = require('../middleware/validation');

// Public endpoints
router.get('/availability', reservationController.getAvailability);

// Authenticated users only: make a reservation
router.post('/book', isAuthenticated, reservationValidation, reservationController.createReservation);

// Customer self-service (requires login)
router.get('/my-reservations', isAuthenticated, reservationController.getMyReservations);
router.post('/my-reservations/:id/cancel', isAuthenticated, reservationController.cancelMyReservation);

// Administrator endpoints (requires admin role)
router.get('/admin/all', isAdmin, reservationController.getAllReservationsAdmin);
router.patch('/admin/:id/status', isAdmin, reservationController.updateReservationStatusAdmin);
router.delete('/admin/:id', isAdmin, reservationController.deleteReservationAdmin);

module.exports = router;
