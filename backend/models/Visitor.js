const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  photo: {
    type: String,
    default: null
  },
  idProof: {
    type: {
      type: String,
      enum: ['aadhar', 'pan', 'driving_license', 'passport', 'other'],
      default: 'aadhar'
    },
    number: String,
    image: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  isBlacklisted: {
    type: Boolean,
    default: false
  },
  blacklistReason: {
    type: String,
    default: null
  },
  visitCount: {
    type: Number,
    default: 0
  },
  lastVisitDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Get full name
visitorSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Index for better query performance
visitorSchema.index({ phone: 1 });
visitorSchema.index({ email: 1 });
visitorSchema.index({ isBlacklisted: 1 });

module.exports = mongoose.model('Visitor', visitorSchema);
