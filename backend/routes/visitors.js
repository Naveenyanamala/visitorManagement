const express = require('express');
const Visitor = require('../models/Visitor');
const { validateVisitor, validateObjectId, validatePagination, validateSearch } = require('../middleware/validation');
const { verifyToken, adminOnly } = require('../middleware/auth');
const { uploadMiddleware, handleUploadError, ImageUploadService } = require('../services/imageUploadService');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for visitor registration
const visitorRegistrationLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many visitor registrations from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Create visitor (public endpoint with rate limiting)
router.post('/', visitorRegistrationLimit, validateVisitor, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, address, idProof } = req.body;

    // Check if visitor already exists by phone number
    let visitor = await Visitor.findOne({ phone });
    
    if (visitor) {
      // Update existing visitor information
      visitor.firstName = firstName;
      visitor.lastName = lastName;
      visitor.email = email || visitor.email;
      visitor.address = address || visitor.address;
      visitor.idProof = idProof || visitor.idProof;
      visitor.visitCount = visitor.visitCount + 1;
      visitor.lastVisitDate = new Date();
    } else {
      // Create new visitor
      visitor = new Visitor({
        firstName,
        lastName,
        email,
        phone,
        address,
        idProof,
        visitCount: 1,
        lastVisitDate: new Date()
      });
    }

    await visitor.save();

    res.status(201).json({
      success: true,
      message: 'Visitor information saved successfully',
      data: { 
        visitor: {
          id: visitor._id,
          firstName: visitor.firstName,
          lastName: visitor.lastName,
          email: visitor.email,
          phone: visitor.phone,
          visitCount: visitor.visitCount
        }
      }
    });
  } catch (error) {
    console.error('Create visitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save visitor information'
    });
  }
});

// Upload visitor photo
router.post('/:id/photo', validateObjectId('id'), uploadMiddleware('photo'), handleUploadError, async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Delete old photo if exists
    if (visitor.photo) {
      const oldPublicId = ImageUploadService.extractPublicId(visitor.photo);
      if (oldPublicId) {
        await ImageUploadService.deleteImage(oldPublicId);
      }
    }

    // Upload new photo
    const uploadResult = await ImageUploadService.uploadVisitorPhoto(req.file.buffer);
    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload photo'
      });
    }

    // Update visitor with new photo URL
    visitor.photo = uploadResult.url;
    await visitor.save();

    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      data: { photoUrl: uploadResult.url }
    });
  } catch (error) {
    console.error('Upload visitor photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload photo'
    });
  }
});

// Upload ID proof
router.post('/:id/id-proof', validateObjectId('id'), uploadMiddleware('idProof'), handleUploadError, async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const { idProofType, idProofNumber } = req.body;

    if (!idProofType || !idProofNumber) {
      return res.status(400).json({
        success: false,
        message: 'ID proof type and number are required'
      });
    }

    // Delete old ID proof if exists
    if (visitor.idProof && visitor.idProof.image) {
      const oldPublicId = ImageUploadService.extractPublicId(visitor.idProof.image);
      if (oldPublicId) {
        await ImageUploadService.deleteImage(oldPublicId);
      }
    }

    // Upload new ID proof
    const uploadResult = await ImageUploadService.uploadIdProof(req.file.buffer);
    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload ID proof'
      });
    }

    // Update visitor with new ID proof
    visitor.idProof = {
      type: idProofType,
      number: idProofNumber,
      image: uploadResult.url
    };
    await visitor.save();

    res.json({
      success: true,
      message: 'ID proof uploaded successfully',
      data: { idProofUrl: uploadResult.url }
    });
  } catch (error) {
    console.error('Upload ID proof error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload ID proof'
    });
  }
});

// Get visitor by phone number (for returning visitors)
router.get('/phone/:phone', async (req, res) => {
  try {
    const visitor = await Visitor.findOne({ phone: req.params.phone });
    
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    res.json({
      success: true,
      data: { 
        visitor: {
          id: visitor._id,
          firstName: visitor.firstName,
          lastName: visitor.lastName,
          email: visitor.email,
          phone: visitor.phone,
          photo: visitor.photo,
          idProof: visitor.idProof,
          address: visitor.address,
          visitCount: visitor.visitCount,
          lastVisitDate: visitor.lastVisitDate,
          isBlacklisted: visitor.isBlacklisted
        }
      }
    });
  } catch (error) {
    console.error('Get visitor by phone error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch visitor'
    });
  }
});

// Get all visitors (admin only)
router.get('/', verifyToken, adminOnly, validatePagination, validateSearch, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const query = {
      ...(search && {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      })
    };

    const visitors = await Visitor.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Visitor.countDocuments(query);

    res.json({
      success: true,
      data: {
        visitors,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get visitors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch visitors'
    });
  }
});

// Get visitor by ID (admin only)
router.get('/:id', verifyToken, adminOnly, validateObjectId('id'), async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);

    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    res.json({
      success: true,
      data: { visitor }
    });
  } catch (error) {
    console.error('Get visitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch visitor'
    });
  }
});

// Update visitor (admin only)
router.put('/:id', verifyToken, adminOnly, validateObjectId('id'), async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    const updatedVisitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Visitor updated successfully',
      data: { visitor: updatedVisitor }
    });
  } catch (error) {
    console.error('Update visitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update visitor'
    });
  }
});

// Blacklist/Unblacklist visitor (admin only)
router.put('/:id/blacklist', verifyToken, adminOnly, validateObjectId('id'), async (req, res) => {
  try {
    const { isBlacklisted, reason } = req.body;

    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    visitor.isBlacklisted = isBlacklisted;
    visitor.blacklistReason = reason || null;
    await visitor.save();

    res.json({
      success: true,
      message: `Visitor ${isBlacklisted ? 'blacklisted' : 'unblacklisted'} successfully`,
      data: { visitor }
    });
  } catch (error) {
    console.error('Blacklist visitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update visitor blacklist status'
    });
  }
});

// Get visitor statistics (admin only)
router.get('/stats/overview', verifyToken, adminOnly, async (req, res) => {
  try {
    const [
      totalVisitors,
      blacklistedVisitors,
      todayVisitors,
      frequentVisitors
    ] = await Promise.all([
      Visitor.countDocuments(),
      Visitor.countDocuments({ isBlacklisted: true }),
      Visitor.countDocuments({
        lastVisitDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }),
      Visitor.countDocuments({ visitCount: { $gte: 5 } })
    ]);

    res.json({
      success: true,
      data: {
        totalVisitors,
        blacklistedVisitors,
        todayVisitors,
        frequentVisitors
      }
    });
  } catch (error) {
    console.error('Get visitor stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch visitor statistics'
    });
  }
});

module.exports = router;
