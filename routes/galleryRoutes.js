const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');
const { isAuthenticated } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public: view gallery photos
router.get('/', galleryController.getGalleryImages);

// Authenticated users/admin: upload photos (up to 10 at a time)
router.post('/upload', isAuthenticated, upload.array('photos', 10), galleryController.uploadGalleryPhotos);

// Authenticated users (own photo) or Admin (any photo): delete
router.delete('/:id', isAuthenticated, galleryController.deleteGalleryPhoto);

module.exports = router;
