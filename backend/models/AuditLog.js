const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      'visitor_request_created',
      'visitor_request_accepted',
      'visitor_request_declined',
      'visitor_request_cancelled',
      'visitor_entered',
      'visitor_exited',
      'member_login',
      'member_logout',
      'admin_login',
      'admin_logout',
      'company_created',
      'company_updated',
      'company_deleted',
      'member_created',
      'member_updated',
      'member_deleted',
      'admin_created',
      'admin_updated',
      'admin_deleted'
    ]
  },
  entityType: {
    type: String,
    required: [true, 'Entity type is required'],
    enum: ['visitor', 'member', 'admin', 'company', 'request']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Entity ID is required']
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'performedByModel',
    required: [true, 'Performed by is required']
  },
  performedByModel: {
    type: String,
    enum: ['Member', 'Admin'],
    required: [true, 'Performed by model is required']
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ timestamp: -1 });

// Static method to create audit log
auditLogSchema.statics.createLog = async function(data) {
  try {
    const log = new this(data);
    await log.save();
    return log;
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw error to avoid breaking main functionality
  }
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
