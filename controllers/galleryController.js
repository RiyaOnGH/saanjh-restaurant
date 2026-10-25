const GalleryImage = require('../models/GalleryImage');
const { uploadImage, deleteImage } = require('../config/cloudinary');

// GET /api/gallery (public)
async function getGalleryImages(req, res, next) {
  try {
    const images = await GalleryImage.find()
      .populate('uploadedBy', 'name role')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      images,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/gallery/upload (authenticated customer or admin)
async function uploadGalleryPhotos(req, res, next) {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided. Please choose image files to upload.',
      });
    }

    const savedRecords = [];
    for (const file of files) {
      const uploadResult = await uploadImage(file.path, 'saanjh_gallery');
      const record = await GalleryImage.create({
        imageUrl: uploadResult.url,
        publicId: uploadResult.publicId,
        provider: uploadResult.provider,
        caption: req.body.caption || 'Restaurant photo',
        uploadedBy: req.user ? req.user._id : null,
        uploaderName: req.user ? req.user.name : 'Saanjh Guest',
      });
      savedRecords.push(record);
    }

    return res.status(201).json({
      success: true,
      message: `${savedRecords.length} photo(s) uploaded successfully!`,
      images: savedRecords,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/gallery/:id (uploader or admin)
async function deleteGalleryPhoto(req, res, next) {
  try {
    const photo = await GalleryImage.findById(req.params.id);
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Gallery photo not found.',
      });
    }

    const isUploader = photo.uploadedBy && photo.uploadedBy.equals(req.user._id);
    const isAdminUser = req.user.role === 'admin';

    if (!isUploader && !isAdminUser) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only remove photos that you uploaded.',
      });
    }

    // Delete image from Cloudinary or local disk
    await deleteImage(photo.publicId, photo.provider);

    await GalleryImage.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: 'Photo removed successfully.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getGalleryImages,
  uploadGalleryPhotos,
  deleteGalleryPhoto,
};
