const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  visitor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visitor',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  purpose: {
    type: String,
    required: [true, 'Purpose is required'],
    enum: ['interview', 'casual', 'delivery', 'meeting', 'other'],
    default: 'casual'
  },
  purposeDescription: {
    type: String,
    trim: true,
    maxlength: [200, 'Purpose description cannot exceed 200 characters']
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Duration is required'],
    min: [5, 'Duration must be at least 5 minutes'],
    max: [480, 'Duration cannot exceed 8 hours']
  },
  scheduledTime: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'completed', 'cancelled', 'expired'],
    default: 'pending'
  },
  priority: {
    type: Number,
    default: 0 // Higher number = higher priority
  },
  queuePosition: {
    type: Number,
    default: 0
  },
  estimatedWaitTime: {
    type: Number, // in minutes
    default: 0
  },
  memberResponse: {
    action: {
      type: String,
      enum: ['accept', 'decline', 'reschedule'],
      default: null
    },
    message: {
      type: String,
      trim: true,
      maxlength: [500, 'Response message cannot exceed 500 characters']
    },
    proposedTime: {
      type: Date,
      default: null
    },
    respondedAt: {
      type: Date,
      default: null
    }
  },
  entryDetails: {
    allowedAt: {
      type: Date,
      default: null
    },
    enteredAt: {
      type: Date,
      default: null
    },
    exitedAt: {
      type: Date,
      default: null
    },
    entryGate: {
      type: String,
      default: null
    },
    securityPersonnel: {
      type: String,
      default: null
    }
  },
  notifications: {
    sentToMember: {
      type: Boolean,
      default: false
    },
    sentToVisitor: {
      type: Boolean,
      default: false
    },
    lastNotificationSent: {
      type: Date,
      default: null
    }
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// Index for better query performance
requestSchema.index({ company: 1, status: 1 });
requestSchema.index({ member: 1, status: 1 });
requestSchema.index({ visitor: 1 });
requestSchema.index({ createdAt: -1 });
requestSchema.index({ status: 1, priority: -1, createdAt: 1 });

// Virtual for total duration
requestSchema.virtual('totalDuration').get(function() {
  if (this.entryDetails.enteredAt && this.entryDetails.exitedAt) {
    return Math.round((this.entryDetails.exitedAt - this.entryDetails.enteredAt) / (1000 * 60));
  }
  return null;
});

// Pre-save middleware to update queue position
requestSchema.pre('save', async function(next) {
  if (this.isNew && this.status === 'pending') {
    const count = await this.constructor.countDocuments({
      company: this.company,
      status: 'pending',
      createdAt: { $lt: this.createdAt }
    });
    this.queuePosition = count + 1;
  }
  next();
});

module.exports = mongoose.model('Request', requestSchema);
