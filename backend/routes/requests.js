const express = require('express');
const Request = require('../models/Request');
const Visitor = require('../models/Visitor');
const Member = require('../models/Member');
const Company = require('../models/Company');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { verifyToken, adminOnly, memberOnly, optionalAuth } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const AuditLog = require('../models/AuditLog');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// PUBLIC ROUTES (must be defined BEFORE parameterized routes like '/:id')
// Public: Get recent requests (limited fields)
router.get('/public', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      Request.find({})
        .populate('visitor', 'firstName lastName phone')
        .populate('member', 'firstName lastName department position')
        .populate('company', 'name location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Request.countDocuments({})
    ]);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get public recent requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
});

// Public: Get request by ID (visitor status page)
router.get('/public/:id', async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('visitor', 'firstName lastName phone photo')
      .populate('member', 'firstName lastName department position')
      .populate('company', 'name location contactPhone');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({ success: true, data: { request } });
  } catch (error) {
    console.error('Get public request error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch request' });
  }
});

// Public: Get all requests for a visitor (by visitorId)
router.get('/public/visitor/:visitorId', async (req, res) => {
  try {
    const { visitorId } = req.params;
    const requests = await Request.find({ visitor: visitorId })
      .populate('company', 'name location')
      .populate('member', 'firstName lastName department position')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { requests } });
  } catch (error) {
    console.error('Get visitor requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch visitor requests' });
  }
});

// Rate limiting for request creation
const requestCreationLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Create visitor request (public endpoint with rate limiting)
router.post('/', requestCreationLimit, validateRequest, async (req, res) => {
  try {
    const { visitorId, companyId, memberId, purpose, duration, purposeDescription, scheduledTime } = req.body;

    // Validate visitor
    const visitor = await Visitor.findById(visitorId);
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    if (visitor.isBlacklisted) {
      return res.status(403).json({
        success: false,
        message: 'Visitor is blacklisted and cannot make requests'
      });
    }

    // Validate company
    const company = await Company.findById(companyId);
    if (!company || !company.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Validate member
    const member = await Member.findById(memberId);
    if (!member || !member.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Check if member belongs to the company
    const memberCompany = member.companies.find(c => 
      c.company.toString() === companyId && c.isActive
    );
    if (!memberCompany) {
      return res.status(400).json({
        success: false,
        message: 'Member does not belong to this company'
      });
    }

    // Check for existing pending request from same visitor to same member
    const existingRequest = await Request.findOne({
      visitor: visitorId,
      member: memberId,
      company: companyId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending request with this member'
      });
    }

    // Create request
    const request = new Request({
      visitor: visitorId,
      company: companyId,
      member: memberId,
      purpose,
      duration,
      purposeDescription,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
      status: 'pending'
    });

    await request.save();

    // Populate request for notifications
    await request.populate([
      { path: 'visitor', select: 'firstName lastName email phone photo' },
      { path: 'member', select: 'firstName lastName email phone preferences' },
      { path: 'company', select: 'name location contactEmail' }
    ]);

    // Send notifications to member
    const notificationResults = await notificationService.notifyMemberOfVisitorRequest(
      request.member,
      request.visitor,
      request,
      request.company
    );

    // Update notification status
    request.notifications.sentToMember = true;
    request.notifications.lastNotificationSent = new Date();
    await request.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`member-${memberId}`).emit('new-request', {
        request: {
          id: request._id,
          visitor: request.visitor,
          purpose: request.purpose,
          duration: request.duration,
          createdAt: request.createdAt
        }
      });
      io.to(`company-${companyId}`).emit('request-update', {
        type: 'new',
        request: {
          id: request._id,
          visitor: request.visitor,
          member: request.member,
          purpose: request.purpose,
          status: request.status
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Request created successfully',
      data: { 
        request: {
          id: request._id,
          status: request.status,
          queuePosition: request.queuePosition,
          estimatedWaitTime: request.estimatedWaitTime,
          createdAt: request.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create request'
    });
  }
});

// Get requests for a member (member dashboard)
router.get('/member/:memberId', verifyToken, memberOnly, validateObjectId('memberId'), validatePagination, async (req, res) => {
  try {
    const { memberId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const skip = (page - 1) * limit;

    // Check if member can access these requests
    if (req.user._id.toString() !== memberId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const query = {
      member: memberId,
      ...(status && { status })
    };

    const requests = await Request.find(query)
      .populate('visitor', 'firstName lastName phone email photo')
      .populate('company', 'name location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Request.countDocuments(query);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get member requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests'
    });
  }
});

// Get requests for a company (admin/company dashboard)
router.get('/company/:companyId', verifyToken, adminOnly, validateObjectId('companyId'), validatePagination, async (req, res) => {
  try {
    const { companyId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const skip = (page - 1) * limit;

    const query = {
      company: companyId,
      ...(status && { status })
    };

    const requests = await Request.find(query)
      .populate('visitor', 'firstName lastName phone email photo')
      .populate('member', 'firstName lastName employeeId department position')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Request.countDocuments(query);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get company requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests'
    });
  }
});

// Get request by ID
router.get('/:id', verifyToken, validateObjectId('id'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('visitor', 'firstName lastName phone email photo address idProof')
      .populate('member', 'firstName lastName employeeId department position phone email')
      .populate('company', 'name location contactPhone address');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Check permissions
    if (req.userType === 'member' && req.user._id.toString() !== request.member._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { request }
    });
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch request'
    });
  }
});

// Public: Get request by ID (visitor status page)
router.get('/public/:id', validateObjectId('id'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('visitor', 'firstName lastName phone photo')
      .populate('member', 'firstName lastName department position')
      .populate('company', 'name location contactPhone');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    res.json({
      success: true,
      data: { request }
    });
  } catch (error) {
    console.error('Get public request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch request'
    });
  }
});

// Public: Get recent requests (limited fields)
router.get('/public/visitors', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      Request.find({})
        .populate('visitor', 'firstName lastName phone')
        .populate('member', 'firstName lastName department position')
        .populate('company', 'name location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Request.countDocuments({})
    ]);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get public recent requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
});

// Public: Get all requests for a visitor (by visitorId)
router.get('/public/visitor/:visitorId', validateObjectId('visitorId'), async (req, res) => {
  try {
    const { visitorId } = req.params;
    const requests = await Request.find({ visitor: visitorId })
      .populate('company', 'name location')
      .populate('member', 'firstName lastName department position')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { requests }
    });
  } catch (error) {
    console.error('Get visitor requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch visitor requests'
    });
  }
});

// Update request status (member response)
router.put('/:id/status', verifyToken, memberOnly, validateObjectId('id'), async (req, res) => {
  try {
    const { action, message, proposedTime } = req.body;

    if (!['accept', 'decline', 'reschedule'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be accept, decline, or reschedule'
      });
    }

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

    // Check if member can respond to this request
    if (req.user._id.toString() !== request.member._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request is no longer pending'
      });
    }

    // Update request based on action
    let newStatus = request.status;
    let entryAllowedAt = null;

    switch (action) {
      case 'accept':
        newStatus = 'accepted';
        entryAllowedAt = new Date();
        break;
      case 'decline':
        newStatus = 'declined';
        break;
      case 'reschedule':
        if (!proposedTime) {
          return res.status(400).json({
            success: false,
            message: 'Proposed time is required for rescheduling'
          });
        }
        newStatus = 'pending';
        request.scheduledTime = new Date(proposedTime);
        break;
    }

    // Update request
    request.status = newStatus;
    request.memberResponse = {
      action,
      message,
      proposedTime: proposedTime ? new Date(proposedTime) : null,
      respondedAt: new Date()
    };

    if (entryAllowedAt) {
      request.entryDetails.allowedAt = entryAllowedAt;
    }

    await request.save();

    // Send notification to visitor
    const notificationResults = await notificationService.notifyVisitorOfStatusUpdate(
      request.visitor,
      request,
      request.member,
      request.company
    );

    // Update notification status
    request.notifications.sentToVisitor = true;
    request.notifications.lastNotificationSent = new Date();
    await request.save();

    // Create audit log
    await AuditLog.createLog({
      action: `visitor_request_${action}ed`,
      entityType: 'request',
      entityId: request._id,
      performedBy: req.user._id,
      performedByModel: 'Member',
      details: { 
        visitorName: request.visitor.fullName,
        action,
        message 
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`company-${request.company._id}`).emit('request-update', {
        type: 'status-change',
        request: {
          id: request._id,
          status: request.status,
          memberResponse: request.memberResponse
        }
      });
    }

    res.json({
      success: true,
      message: `Request ${action}ed successfully`,
      data: { request }
    });
  } catch (error) {
    console.error('Update request status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update request status'
    });
  }
});

// Mark visitor as entered (admin/security)
router.put('/:id/enter', verifyToken, adminOnly, validateObjectId('id'), async (req, res) => {
  try {
    const { entryGate, securityPersonnel } = req.body;

    const request = await Request.findById(req.params.id)
      .populate('visitor', 'firstName lastName phone')
      .populate('member', 'firstName lastName')
      .populate('company', 'name');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Request must be accepted before marking entry'
      });
    }

    if (request.entryDetails.enteredAt) {
      return res.status(400).json({
        success: false,
        message: 'Visitor has already been marked as entered'
      });
    }

    // Update entry details
    request.entryDetails.enteredAt = new Date();
    request.entryDetails.entryGate = entryGate;
    request.entryDetails.securityPersonnel = securityPersonnel;
    request.status = 'in-progress';

    await request.save();

    // Create audit log
    await AuditLog.createLog({
      action: 'visitor_entered',
      entityType: 'request',
      entityId: request._id,
      performedBy: req.user._id,
      performedByModel: 'Admin',
      details: { 
        visitorName: request.visitor.fullName,
        entryGate,
        securityPersonnel 
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`company-${request.company._id}`).emit('request-update', {
        type: 'entry',
        request: {
          id: request._id,
          status: request.status,
          entryDetails: request.entryDetails
        }
      });
    }

    res.json({
      success: true,
      message: 'Visitor marked as entered successfully',
      data: { request }
    });
  } catch (error) {
    console.error('Mark visitor entered error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark visitor as entered'
    });
  }
});

// Mark visitor as exited (admin/security)
router.put('/:id/exit', verifyToken, adminOnly, validateObjectId('id'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('visitor', 'firstName lastName phone')
      .populate('member', 'firstName lastName')
      .populate('company', 'name');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (!request.entryDetails.enteredAt) {
      return res.status(400).json({
        success: false,
        message: 'Visitor must be marked as entered before marking exit'
      });
    }

    if (request.entryDetails.exitedAt) {
      return res.status(400).json({
        success: false,
        message: 'Visitor has already been marked as exited'
      });
    }

    // Update exit details
    request.entryDetails.exitedAt = new Date();
    request.status = 'completed';

    await request.save();

    // Send completion notification to visitor
    const notificationResults = await notificationService.notifyVisitorOfStatusUpdate(
      request.visitor,
      request,
      request.member,
      request.company
    );

    // Create audit log
    await AuditLog.createLog({
      action: 'visitor_exited',
      entityType: 'request',
      entityId: request._id,
      performedBy: req.user._id,
      performedByModel: 'Admin',
      details: { 
        visitorName: request.visitor.fullName,
        duration: request.totalDuration
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`company-${request.company._id}`).emit('request-update', {
        type: 'exit',
        request: {
          id: request._id,
          status: request.status,
          entryDetails: request.entryDetails,
          totalDuration: request.totalDuration
        }
      });
    }

    res.json({
      success: true,
      message: 'Visitor marked as exited successfully',
      data: { request }
    });
  } catch (error) {
    console.error('Mark visitor exited error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark visitor as exited'
    });
  }
});

// Cancel request
router.put('/:id/cancel', verifyToken, validateObjectId('id'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('visitor', 'firstName lastName phone')
      .populate('member', 'firstName lastName')
      .populate('company', 'name');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Check permissions
    const canCancel = req.userType === 'admin' || 
                     (req.userType === 'member' && req.user._id.toString() === request.member._id.toString());

    if (!canCancel) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (['completed', 'cancelled'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: 'Request cannot be cancelled'
      });
    }

    // Update request
    request.status = 'cancelled';
    await request.save();

    // Create audit log
    await AuditLog.createLog({
      action: 'visitor_request_cancelled',
      entityType: 'request',
      entityId: request._id,
      performedBy: req.user._id,
      performedByModel: req.userType === 'admin' ? 'Admin' : 'Member',
      details: { 
        visitorName: request.visitor.fullName,
        cancelledBy: req.userType
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`company-${request.company._id}`).emit('request-update', {
        type: 'cancelled',
        request: {
          id: request._id,
          status: request.status
        }
      });
    }

    res.json({
      success: true,
      message: 'Request cancelled successfully',
      data: { request }
    });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel request'
    });
  }
});

// Get queue status for a company
router.get('/queue/:companyId', validateObjectId('companyId'), async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await Company.findById(companyId);
    if (!company || !company.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const pendingRequests = await Request.find({
      company: companyId,
      status: 'pending'
    })
    .populate('visitor', 'firstName lastName phone')
    .populate('member', 'firstName lastName employeeId department')
    .sort({ priority: -1, createdAt: 1 });

    const queueData = pendingRequests.map((request, index) => ({
      id: request._id,
      position: index + 1,
      visitor: request.visitor,
      member: request.member,
      purpose: request.purpose,
      duration: request.duration,
      estimatedWaitTime: index * 15, // 15 minutes per person
      createdAt: request.createdAt
    }));

    res.json({
      success: true,
      data: {
        queue: queueData,
        totalPending: pendingRequests.length,
        estimatedWaitTime: pendingRequests.length * 15
      }
    });
  } catch (error) {
    console.error('Get queue status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch queue status'
    });
  }
});

module.exports = router;
