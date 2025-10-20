const express = require('express');
const Member = require('../models/Member');
const Company = require('../models/Company');
const { validateMember, validateObjectId, validatePagination, validateSearch } = require('../middleware/validation');
const { verifyToken, adminOnly, memberOnly, checkAdminPermission } = require('../middleware/auth');
const { uploadMiddleware, handleUploadError, ImageUploadService } = require('../services/imageUploadService');
const notificationService = require('../services/notificationService');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

const router = express.Router();

// Get members by company (public endpoint for visitor selection)
router.get('/company/:companyId', validateObjectId('companyId'), validatePagination, validateSearch, async (req, res) => {
  try {
    const { companyId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const company = await Company.findById(companyId);
    if (!company || !company.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const query = {
      isActive: true,
      'companies.company': companyId,
      'companies.isActive': true,
      ...(search && {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { employeeId: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } },
          { position: { $regex: search, $options: 'i' } }
        ]
      })
    };

    const members = await Member.find(query)
      .select('firstName lastName employeeId department position profilePicture companies')
      .populate('companies.company', 'name location')
      .sort({ firstName: 1, lastName: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Member.countDocuments(query);

    res.json({
      success: true,
      data: {
        members,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get members by company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch members'
    });
  }
});

// Get member by ID (public, limited fields) for visitor flow
router.get('/public/:id', validateObjectId('id'), async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
      .select('firstName lastName employeeId department position profilePicture companies isActive');


    if (!member || !member.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    res.json({
      success: true,
      data: { member }
    });
  } catch (error) {
    console.error('Get public member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch member'
    });
  }
});

// Get all members (admin only)
router.get('/', verifyToken, adminOnly, validatePagination, validateSearch, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const query = {
      isActive: true,
      ...(search && {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { employeeId: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } },
          { position: { $regex: search, $options: 'i' } }
        ]
      })
    };

    const members = await Member.find(query)
      .select('-password')
      .populate('companies.company', 'name location')
      .sort({ firstName: 1, lastName: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Member.countDocuments(query);

    res.json({
      success: true,
      data: {
        members,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch members'
    });
  }
});

// Get member by ID
router.get('/:id', verifyToken, validateObjectId('id'), async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
      .select('-password')
      .populate('companies.company', 'name location');

    if (!member || !member.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Check if user can access this member's data
    if (req.userType === 'member' && req.user._id.toString() !== member._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { member }
    });
  } catch (error) {
    console.error('Get member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch member'
    });
  }
});

// Create member (admin only)
// Note: We don't require 'password' in the request body; a temporary password will be generated.
router.post('/', verifyToken, checkAdminPermission('manageMembers'), async (req, res) => {
  try {
    const { companies, ...memberData } = req.body;

    // Validate companies
    if (!companies || !Array.isArray(companies) || companies.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one company is required'
      });
    }

    // Basic field validation
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'employeeId', 'department', 'position'];
    const missing = requiredFields.filter((f) => !memberData[f]);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`
      });
    }

    // Check if companies exist
    const companyIds = companies.map(c => c.company);
    const existingCompanies = await Company.find({ _id: { $in: companyIds }, isActive: true });
    if (existingCompanies.length !== companyIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more companies not found'
      });
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');

    const member = new Member({
      ...memberData,
      password: tempPassword,
      companies: companies.map(company => ({
        company: company.company,
        role: company.role || 'employee',
        joinedAt: new Date(),
        isActive: true
      }))
    });

    await member.save();

    // Send welcome email with temporary password
    const company = await Company.findById(companies[0].company);
    await notificationService.sendWelcomeEmail(member, company, tempPassword);

    // Create audit log
    await AuditLog.createLog({
      action: 'member_created',
      entityType: 'member',
      entityId: member._id,
      performedBy: req.user._id,
      performedByModel: 'Admin',
      details: { memberName: member.fullName, employeeId: member.employeeId },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Member created successfully',
      data: { 
        member: {
          ...member.toObject(),
          password: undefined,
          tempPassword
        }
      }
    });
  } catch (error) {
    console.error('Create member error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create member'
    });
  }
});

// Update member
router.put('/:id', verifyToken, validateObjectId('id'), async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member || !member.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Check permissions
    if (req.userType === 'member' && req.user._id.toString() !== member._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Admin can update everything, member can only update certain fields
    const allowedFields = req.userType === 'admin' 
      ? Object.keys(req.body)
      : ['firstName', 'lastName', 'phone', 'preferences'];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const updatedMember = await Member.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password').populate('companies.company', 'name location');

    // Create audit log
    await AuditLog.createLog({
      action: 'member_updated',
      entityType: 'member',
      entityId: member._id,
      performedBy: req.user._id,
      performedByModel: req.userType === 'admin' ? 'Admin' : 'Member',
      details: { memberName: member.fullName },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Member updated successfully',
      data: { member: updatedMember }
    });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update member'
    });
  }
});

// Delete member (admin only)
router.delete('/:id', verifyToken, checkAdminPermission('manageMembers'), validateObjectId('id'), async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Soft delete by setting isActive to false
    member.isActive = false;
    await member.save();

    // Create audit log
    await AuditLog.createLog({
      action: 'member_deleted',
      entityType: 'member',
      entityId: member._id,
      performedBy: req.user._id,
      performedByModel: 'Admin',
      details: { memberName: member.fullName, employeeId: member.employeeId },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Member deleted successfully'
    });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete member'
    });
  }
});

// Upload member profile picture
router.post('/:id/profile-picture', verifyToken, validateObjectId('id'), uploadMiddleware('profilePicture'), handleUploadError, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member || !member.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Check permissions
    if (req.userType === 'member' && req.user._id.toString() !== member._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Delete old profile picture if exists
    if (member.profilePicture) {
      const oldPublicId = ImageUploadService.extractPublicId(member.profilePicture);
      if (oldPublicId) {
        await ImageUploadService.deleteImage(oldPublicId);
      }
    }

    // Upload new profile picture
    const uploadResult = await ImageUploadService.uploadMemberPhoto(req.file.buffer);
    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload profile picture'
      });
    }

    // Update member with new profile picture URL
    member.profilePicture = uploadResult.url;
    await member.save();

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: { profilePictureUrl: uploadResult.url }
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile picture'
    });
  }
});

// Add member to company (admin only)
router.post('/:id/companies', verifyToken, checkAdminPermission('manageMembers'), validateObjectId('id'), async (req, res) => {
  try {
    const { companyId, role = 'employee' } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    const member = await Member.findById(req.params.id);
    if (!member || !member.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    const company = await Company.findById(companyId);
    if (!company || !company.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if member is already in this company
    const existingCompany = member.companies.find(c => c.company.toString() === companyId);
    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: 'Member is already in this company'
      });
    }

    // Add company to member
    member.companies.push({
      company: companyId,
      role,
      joinedAt: new Date(),
      isActive: true
    });

    await member.save();

    res.json({
      success: true,
      message: 'Member added to company successfully'
    });
  } catch (error) {
    console.error('Add member to company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add member to company'
    });
  }
});

// Remove member from company (admin only)
router.delete('/:id/companies/:companyId', verifyToken, checkAdminPermission('manageMembers'), validateObjectId('id'), validateObjectId('companyId'), async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member || !member.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Remove company from member
    member.companies = member.companies.filter(c => c.company.toString() !== req.params.companyId);
    await member.save();

    res.json({
      success: true,
      message: 'Member removed from company successfully'
    });
  } catch (error) {
    console.error('Remove member from company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member from company'
    });
  }
});

module.exports = router;
