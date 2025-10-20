const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

class ImageUploadService {
  // Upload image to Cloudinary
  async uploadImage(buffer, folder = 'visitor-management', options = {}) {
    try {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
            quality: 'auto',
            fetch_format: 'auto',
            ...options
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      });

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height
      };
    } catch (error) {
      console.error('Image upload failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Upload visitor photo
  async uploadVisitorPhoto(buffer) {
    return await this.uploadImage(buffer, 'visitor-management/visitors', {
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto' }
      ]
    });
  }

  // Upload member profile picture
  async uploadMemberPhoto(buffer) {
    return await this.uploadImage(buffer, 'visitor-management/members', {
      transformation: [
        { width: 300, height: 300, crop: 'fill', gravity: 'face' },
        { quality: 'auto' }
      ]
    });
  }

  // Upload company logo
  async uploadCompanyLogo(buffer) {
    return await this.uploadImage(buffer, 'visitor-management/companies', {
      transformation: [
        { width: 200, height: 200, crop: 'fill' },
        { quality: 'auto' }
      ]
    });
  }

  // Upload ID proof
  async uploadIdProof(buffer) {
    return await this.uploadImage(buffer, 'visitor-management/id-proofs', {
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto' }
      ]
    });
  }

  // Delete image from Cloudinary
  async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return {
        success: result.result === 'ok',
        result: result.result
      };
    } catch (error) {
      console.error('Image deletion failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Extract public ID from Cloudinary URL
  extractPublicId(url) {
    const matches = url.match(/\/v\d+\/(.+)\./);
    return matches ? matches[1] : null;
  }

  // Generate optimized image URL
  generateOptimizedUrl(url, options = {}) {
    const publicId = this.extractPublicId(url);
    if (!publicId) return url;

    const defaultOptions = {
      quality: 'auto',
      fetch_format: 'auto'
    };

    const transformation = { ...defaultOptions, ...options };
    return cloudinary.url(publicId, { transformation });
  }

  // Get image info
  async getImageInfo(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return {
        success: true,
        info: result
      };
    } catch (error) {
      console.error('Failed to get image info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Middleware for handling file uploads
const uploadMiddleware = (fieldName, maxCount = 1) => {
  return upload.single(fieldName);
};

const uploadMultipleMiddleware = (fieldName, maxCount = 5) => {
  return upload.array(fieldName, maxCount);
};

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded.'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed.'
    });
  }
  
  next(error);
};

module.exports = {
  ImageUploadService: new ImageUploadService(),
  uploadMiddleware,
  uploadMultipleMiddleware,
  handleUploadError
};
