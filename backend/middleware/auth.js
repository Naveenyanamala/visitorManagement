const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Member = require('../models/Member');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists and is active
    let user = await Admin.findById(decoded.id);
    let userType = 'admin';
    
    if (!user) {
      user = await Member.findById(decoded.id);
      userType = 'member';
    }
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found.'
      });
    }
    
    req.user = user;
    req.userType = userType;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Token verification failed.'
    });
  }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.userType !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Member only middleware
const memberOnly = (req, res, next) => {
  if (req.userType !== 'member') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Member privileges required.'
    });
  }
  next();
};

// Super admin only middleware
const superAdminOnly = (req, res, next) => {
  if (req.userType !== 'admin' || req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super admin privileges required.'
    });
  }
  next();
};

// Check specific admin permissions
const checkAdminPermission = (permission) => {
  return (req, res, next) => {
    if (req.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    if (req.user.role === 'super_admin' || req.user.permissions[permission]) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: `Access denied. ${permission} permission required.`
    });
  };
};

// Optional authentication (for public routes that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      req.user = null;
      req.userType = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let user = await Admin.findById(decoded.id);
    let userType = 'admin';
    
    if (!user) {
      user = await Member.findById(decoded.id);
      userType = 'member';
    }
    
    if (user && user.isActive) {
      req.user = user;
      req.userType = userType;
    } else {
      req.user = null;
      req.userType = null;
    }
    
    next();
  } catch (error) {
    req.user = null;
    req.userType = null;
    next();
  }
};

module.exports = {
  verifyToken,
  adminOnly,
  memberOnly,
  superAdminOnly,
  checkAdminPermission,
  optionalAuth
};
