const express = require('express');
const Company = require('../models/Company');
const { validateCompany, validateObjectId, validatePagination, validateSearch } = require('../middleware/validation');
const { verifyToken, adminOnly, checkAdminPermission } = require('../middleware/auth');
const { uploadMiddleware, handleUploadError, ImageUploadService } = require('../services/imageUploadService');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

// Get all companies (public endpoint for visitor selection)
router.get('/', validatePagination, validateSearch, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const query = {
      isActive: true,
      ...(search && {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } }
        ]
      })
    };

    const companies = await Company.find(query)
      .select('name location description logo contactEmail contactPhone address settings')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Company.countDocuments(query);

    res.json({
      success: true,
      data: {
        companies,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch companies'
    });
  }
});

// Get company by ID (public endpoint)
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .select('name location description logo contactEmail contactPhone address settings isActive')
      .populate('createdBy', 'firstName lastName');

    if (!company || !company.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      data: { company }
    });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company'
    });
  }
});

// Create company (admin only)
router.post('/', verifyToken, checkAdminPermission('manageCompanies'), validateCompany, async (req, res) => {
  try {
    const companyData = {
      ...req.body,
      createdBy: req.user._id
    };

    const company = new Company(companyData);
    await company.save();

    // Create audit log
    await AuditLog.createLog({
      action: 'company_created',
      entityType: 'company',
      entityId: company._id,
      performedBy: req.user._id,
      performedByModel: 'Admin',
      details: { companyName: company.name },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: { company }
    });
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create company'
    });
  }
});

// Update company (admin only)
router.put('/:id', verifyToken, checkAdminPermission('manageCompanies'), validateObjectId('id'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Create audit log
    await AuditLog.createLog({
      action: 'company_updated',
      entityType: 'company',
      entityId: company._id,
      performedBy: req.user._id,
      performedByModel: 'Admin',
      details: { companyName: company.name },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: { company: updatedCompany }
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company'
    });
  }
});

// Delete company (admin only)
router.delete('/:id', verifyToken, checkAdminPermission('manageCompanies'), validateObjectId('id'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Soft delete by setting isActive to false
    company.isActive = false;
    await company.save();

    // Create audit log
    await AuditLog.createLog({
      action: 'company_deleted',
      entityType: 'company',
      entityId: company._id,
      performedBy: req.user._id,
      performedByModel: 'Admin',
      details: { companyName: company.name },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete company'
    });
  }
});

// Upload company logo
router.post('/:id/logo', verifyToken, checkAdminPermission('manageCompanies'), validateObjectId('id'), uploadMiddleware('logo'), handleUploadError, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Delete old logo if exists
    if (company.logo) {
      const oldPublicId = ImageUploadService.extractPublicId(company.logo);
      if (oldPublicId) {
        await ImageUploadService.deleteImage(oldPublicId);
      }
    }

    // Upload new logo
    const uploadResult = await ImageUploadService.uploadCompanyLogo(req.file.buffer);
    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload logo'
      });
    }

    // Update company with new logo URL
    company.logo = uploadResult.url;
    await company.save();

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: { logoUrl: uploadResult.url }
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload logo'
    });
  }
});

// Get company statistics (admin only)
router.get('/:id/stats', verifyToken, adminOnly, validateObjectId('id'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const Member = require('../models/Member');
    const Request = require('../models/Request');

    const [
      totalMembers,
      activeMembers,
      totalRequests,
      pendingRequests,
      todayRequests
    ] = await Promise.all([
      Member.countDocuments({ 'companies.company': company._id }),
      Member.countDocuments({ 'companies.company': company._id, 'companies.isActive': true }),
      Request.countDocuments({ company: company._id }),
      Request.countDocuments({ company: company._id, status: 'pending' }),
      Request.countDocuments({
        company: company._id,
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalMembers,
        activeMembers,
        totalRequests,
        pendingRequests,
        todayRequests
      }
    });
  } catch (error) {
    console.error('Get company stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company statistics'
    });
  }
});

module.exports = router;
