const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'client'],
    default: 'client'
  },
  company: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  whatsappConfig: {
    accessToken: String,
    phoneNumberId: String,
    verifyToken: String,
    webhookUrl: String,
    isActive: {
      type: Boolean,
      default: false
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      default: 'basic'
    },
    messagesLimit: {
      type: Number,
      default: 1000
    },
    messagesUsed: {
      type: Number,
      default: 0
    },
    expiresAt: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if user has reached message limit
userSchema.methods.hasReachedLimit = function() {
  return this.subscription.messagesUsed >= this.subscription.messagesLimit;
};

// Increment message usage
userSchema.methods.incrementMessageUsage = function(count = 1) {
  this.subscription.messagesUsed += count;
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
