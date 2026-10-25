const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('Cloudinary storage initialized.');
} else {
  console.log('Cloudinary credentials not provided. Using local file storage for uploads.');
}

async function uploadImage(filePath, folder = 'saanjh_gallery') {
  if (isCloudinaryConfigured) {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
    });
    // Remove temporary local file if any
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {}
    return {
      url: result.secure_url,
      publicId: result.public_id,
      provider: 'cloudinary',
    };
  }

  // Local fallback: file is stored in public/uploads/
  const fileName = path.basename(filePath);
  return {
    url: `/uploads/${fileName}`,
    publicId: fileName,
    provider: 'local',
  };
}

async function deleteImage(publicId, provider = 'cloudinary') {
  if (provider === 'cloudinary' && isCloudinaryConfigured) {
    try {
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (err) {
      console.warn('Error deleting Cloudinary image:', err.message);
      return false;
    }
  }

  // Local deletion
  try {
    const localPath = path.join(__dirname, '..', 'public', 'uploads', publicId);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
    return true;
  } catch (err) {
    console.warn('Error deleting local image:', err.message);
    return false;
  }
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadImage,
  deleteImage,
};
