const mongoose = require('mongoose');

const galleryImageSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: [true, 'Image URL is required'],
    },
    publicId: {
      type: String,
      required: [true, 'Image identifier is required'],
    },
    caption: {
      type: String,
      trim: true,
      default: 'Restaurant photo',
      maxlength: [200, 'Caption cannot exceed 200 characters'],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    uploaderName: {
      type: String,
      default: 'Saanjh Guest',
    },
    provider: {
      type: String,
      enum: ['cloudinary', 'local'],
      default: 'local',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('GalleryImage', galleryImageSchema);
