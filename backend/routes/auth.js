const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Member = require('../models/Member');
const bcrypt = require('bcryptjs');
const { validateLogin } = require('../middleware/validation');
const { verifyToken } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Admin login
router.post('/admin/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if admin exists
    const admin = await Admin.findOne({ email, isActive: true });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (admin.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts'
      });
    }

    // Check password
    console.log("passowrd",password)
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      // Increment login attempts
      await admin.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    await admin.resetLoginAttempts();

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate token
    const token = generateToken(admin._id);

    // Create audit log
    await AuditLog.createLog({
      action: 'admin_login',
      entityType: 'admin',
      entityId: admin._id,
      performedBy: admin._id,
      performedByModel: 'Admin',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: admin._id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions
        }
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Member login
router.post('/member/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if member exists
    const member = await Member.findOne({ email, isActive: true });
    if (!member) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, member.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    member.lastLogin = new Date();
    await member.save();

    // Generate token
    const token = generateToken(member._id);

    // Create audit log
    await AuditLog.createLog({
      action: 'member_login',
      entityType: 'member',
      entityId: member._id,
      performedBy: member._id,
      performedByModel: 'Member',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          phone: member.phone,
          employeeId: member.employeeId,
          department: member.department,
          position: member.position,
          companies: member.companies,
          preferences: member.preferences
        }
      }
    });
  } catch (error) {
    console.error('Member login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Get current user profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    let user;
    
    if (req.userType === 'admin') {
      user = await Admin.findById(req.user._id).select('-password');
    } else {
      user = await Member.findById(req.user._id)
        .populate('companies.company', 'name location')
        .select('-password');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user,
        userType: req.userType
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
});

// Update profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { firstName, lastName, phone, preferences } = req.body;
    const updateData = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (preferences) updateData.preferences = preferences;

    let user;
    if (req.userType === 'admin') {
      user = await Admin.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');
    } else {
      user = await Member.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true, runValidators: true }
      ).populate('companies.company', 'name location').select('-password');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Change password
router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await req.user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    req.user.password = newPassword;
    await req.user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

// Logout (client-side token removal, but we can log it)
router.post('/logout', verifyToken, async (req, res) => {
  try {
    // Create audit log
    await AuditLog.createLog({
      action: req.userType === 'admin' ? 'admin_logout' : 'member_logout',
      entityType: req.userType,
      entityId: req.user._id,
      performedBy: req.user._id,
      performedByModel: req.userType === 'admin' ? 'Admin' : 'Member',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// Verify token endpoint
router.get('/verify', verifyToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    data: {
      userType: req.userType,
      userId: req.user._id
    }
  });
});

module.exports = router;
