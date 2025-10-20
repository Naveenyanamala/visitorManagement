const express = require('express');
const Admin = require('../models/Admin');
const Company = require('../models/Company');
const Member = require('../models/Member');
const Visitor = require('../models/Visitor');
const Request = require('../models/Request');
const AuditLog = require('../models/AuditLog');
const { validateAdmin, validateObjectId, validatePagination, validateSearch } = require('../middleware/validation');
const { verifyToken, adminOnly, superAdminOnly, checkAdminPermission } = require('../middleware/auth');
const { uploadMiddleware, handleUploadError, ImageUploadService } = require('../services/imageUploadService');
const notificationService = require('../services/notificationService');
const crypto = require('crypto');

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', verifyToken, adminOnly, async (req, res) => {
  try {
    const [
      totalCompanies,
      activeCompanies,
      totalMembers,
      activeMembers,
      totalVisitors,
      totalRequests,
      pendingRequests,
      todayRequests,
      completedRequests
    ] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ isActive: true }),
      Member.countDocuments(),
      Member.countDocuments({ isActive: true }),
      Visitor.countDocuments(),
      Request.countDocuments(),
      Request.countDocuments({ status: 'pending' }),
      Request.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }),
      Request.countDocuments({ status: 'completed' })
    ]);

    // Get recent requests
    const recentRequests = await Request.find()
      .populate('visitor', 'firstName lastName phone')
      .populate('member', 'firstName lastName employeeId')
      .populate('company', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get requests by status
    const requestsByStatus = await Request.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get requests by purpose
    const requestsByPurpose = await Request.aggregate([
      {
        $group: {
          _id: '$purpose',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get daily request trends (last 7 days)
    const dailyTrends = await Request.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalCompanies,
          activeCompanies,
          totalMembers,
          activeMembers,
          totalVisitors,
          totalRequests,
          pendingRequests,
          todayRequests,
          completedRequests
        },
        recentRequests,
        requestsByStatus,
        requestsByPurpose,
        dailyTrends
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
});

// Get all admins (super admin only)
router.get('/admins', verifyToken, superAdminOnly, validatePagination, validateSearch, async (req, res) => {
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
          { email: { $regex: search, $options: 'i' } }
        ]
      })
    };

    const admins = await Admin.find(query)
      .select('-password')
      .sort({ firstName: 1, lastName: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Admin.countDocuments(query);

    res.json({
      success: true,
      data: {
        admins,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admins'
    });
  }
});

// Create admin (super admin only)
router.post('/admins', verifyToken, superAdminOnly, validateAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, permissions, phone } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    const admin = new Admin({
      firstName,
      lastName,
      email,
      password,
      role: role || 'admin',
      permissions: permissions || {
        manageCompanies: false,
        manageMembers: true,
        manageRequests: true,
        viewReports: true,
        manageSettings: false
      },
      phone
    });

    await admin.save();

    // Create audit log
    await AuditLog.createLog({
      action: 'admin_created',
      entityType: 'admin',
      entityId: admin._id,
      performedBy: req.user._id,
      performedByModel: 'Admin',
      details: { adminName: admin.fullName, email: admin.email },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: { 
        admin: {
          id: admin._id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions,
          phone: admin.phone,
          isActive: admin.isActive,
          createdAt: admin.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin'
    });
  }
});

// Update admin (super admin only)
router.put('/admins/:id', verifyToken, superAdminOnly, validateObjectId('id'), async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Prevent updating super admin
    if (admin.role === 'super_admin' && req.user._id.toString() !== admin._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify super admin account'
      });
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    // Create audit log
    await AuditLog.createLog({
      action: 'admin_updated',
      entityType: 'admin',
      entityId: admin._id,
      performedBy: req.user._id,
      performedByModel: 'Admin',
      details: { adminName: admin.fullName },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Admin updated successfully',
      data: { admin: updatedAdmin }
    });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin'
    });
  }
});

// Delete admin (super admin only)
router.delete('/admins/:id', verifyToken, superAdminOnly, validateObjectId('id'), async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Prevent deleting super admin
    if (admin.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete super admin account'
      });
    }

    // Prevent self-deletion
    if (req.user._id.toString() === admin._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Soft delete by setting isActive to false
    admin.isActive = false;
    await admin.save();

    // Create audit log
    await AuditLog.createLog({
      action: 'admin_deleted',
      entityType: 'admin',
      entityId: admin._id,
      performedBy: req.user._id,
      performedByModel: 'Admin',
      details: { adminName: admin.fullName, email: admin.email },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete admin'
    });
  }
});

// Get audit logs
router.get('/audit-logs', verifyToken, adminOnly, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { action, entityType, startDate, endDate } = req.query;

    const query = {};
    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .populate('performedBy', 'firstName lastName email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
});

// Force accept request (admin only)
router.put('/requests/:id/force-accept', verifyToken, checkAdminPermission('manageRequests'), validateObjectId('id'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('visitor', 'firstName lastName phone email')
      .populate('member', 'firstName lastName email phone preferences')
      .populate('company', 'name location');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request is no longer pending'
      });
    }

    // Force accept the request
    request.status = 'accepted';
    request.memberResponse = {
      action: 'accept',
      message: 'Force accepted by admin',
      respondedAt: new Date()
    };
    request.entryDetails.allowedAt = new Date();

    await request.save();

    // Send notification to visitor
    const notificationResults = await notificationService.notifyVisitorOfStatusUpdate(
      request.visitor,
      request,
      request.member,
      request.company
    );

    // Create audit log
    await AuditLog.createLog({
      action: 'visitor_request_accepted',
      entityType: 'request',
      entityId: request._id,
      performedBy: req.user._id,
      performedByModel: 'Admin',
      details: { 
        visitorName: request.visitor.fullName,
        action: 'force-accept',
        message: 'Force accepted by admin'
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Request force accepted successfully',
      data: { request }
    });
  } catch (error) {
    console.error('Force accept request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to force accept request'
    });
  }
});

// Send manual notification (admin only)
router.post('/notifications/send', verifyToken, adminOnly, async (req, res) => {
  try {
    const { type, recipient, subject, message, recipientType } = req.body;

    if (!['email', 'sms', 'both'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification type'
      });
    }

    if (!recipient || !message) {
      return res.status(400).json({
        success: false,
        message: 'Recipient and message are required'
      });
    }

    const results = {};

    if (type === 'email' || type === 'both') {
      results.email = await notificationService.sendEmail(
        recipient,
        subject || 'Notification from Krishe Emerald',
        `<p>${message}</p>`
      );
    }

    if (type === 'sms' || type === 'both') {
      results.sms = await notificationService.sendSMS(recipient, message);
    }

    // Create audit log
    await AuditLog.createLog({
      action: 'manual_notification_sent',
      entityType: 'admin',
      entityId: req.user._id,
      performedBy: req.user._id,
      performedByModel: 'Admin',
      details: { 
        type,
        recipient,
        recipientType,
        message: message.substring(0, 100)
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Notification sent successfully',
      data: { results }
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification'
    });
  }
});

// Get system settings
router.get('/settings', verifyToken, adminOnly, async (req, res) => {
  try {
    // This would typically come from a settings collection
    const settings = {
      system: {
        name: 'Krishe Emerald Visitor Management',
        version: '1.0.0',
        maintenanceMode: false
      },
      notifications: {
        emailEnabled: !!process.env.EMAIL_HOST,
        smsEnabled: !!process.env.TWILIO_ACCOUNT_SID
      },
      security: {
        maxLoginAttempts: 5,
        lockoutDuration: 2 * 60 * 60 * 1000, // 2 hours
        sessionTimeout: 7 * 24 * 60 * 60 * 1000 // 7 days
      },
      limits: {
        maxFileSize: 5 * 1024 * 1024, // 5MB
        maxRequestsPerHour: 100,
        maxVisitorsPerDay: 1000
      }
    };

    res.json({
      success: true,
      data: { settings }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

// Generate reports
router.get('/reports/:type', verifyToken, checkAdminPermission('viewReports'), async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate, companyId } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    let reportData = {};

    switch (type) {
      case 'visitor-summary':
        const visitorStats = await Request.aggregate([
          { $match: { ...(Object.keys(dateFilter).length && { createdAt: dateFilter }) } },
          {
            $group: {
              _id: null,
              totalVisitors: { $sum: 1 },
              uniqueVisitors: { $addToSet: '$visitor' },
              completedVisits: {
                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
              },
              averageDuration: { $avg: '$duration' }
            }
          }
        ]);

        reportData = visitorStats[0] || {
          totalVisitors: 0,
          uniqueVisitors: 0,
          completedVisits: 0,
          averageDuration: 0
        };
        reportData.uniqueVisitors = reportData.uniqueVisitors.length;
        break;

      case 'company-performance':
        const companyStats = await Request.aggregate([
          { $match: { ...(Object.keys(dateFilter).length && { createdAt: dateFilter }) } },
          {
            $group: {
              _id: '$company',
              totalRequests: { $sum: 1 },
              completedRequests: {
                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
              },
              averageWaitTime: { $avg: '$estimatedWaitTime' }
            }
          },
          {
            $lookup: {
              from: 'companies',
              localField: '_id',
              foreignField: '_id',
              as: 'company'
            }
          },
          { $unwind: '$company' },
          {
            $project: {
              companyName: '$company.name',
              totalRequests: 1,
              completedRequests: 1,
              averageWaitTime: 1,
              completionRate: {
                $multiply: [
                  { $divide: ['$completedRequests', '$totalRequests'] },
                  100
                ]
              }
            }
          }
        ]);

        reportData = companyStats;
        break;

      case 'member-activity':
        const memberStats = await Request.aggregate([
          { $match: { ...(Object.keys(dateFilter).length && { createdAt: dateFilter }) } },
          {
            $group: {
              _id: '$member',
              totalRequests: { $sum: 1 },
              acceptedRequests: {
                $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
              },
              averageResponseTime: { $avg: '$memberResponse.respondedAt' }
            }
          },
          {
            $lookup: {
              from: 'members',
              localField: '_id',
              foreignField: '_id',
              as: 'member'
            }
          },
          { $unwind: '$member' },
          {
            $project: {
              memberName: { $concat: ['$member.firstName', ' ', '$member.lastName'] },
              employeeId: '$member.employeeId',
              department: '$member.department',
              totalRequests: 1,
              acceptedRequests: 1,
              acceptanceRate: {
                $multiply: [
                  { $divide: ['$acceptedRequests', '$totalRequests'] },
                  100
                ]
              }
            }
          }
        ]);

        reportData = memberStats;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    res.json({
      success: true,
      data: {
        reportType: type,
        dateRange: { startDate, endDate },
        generatedAt: new Date(),
        data: reportData
      }
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
});

module.exports = router;
