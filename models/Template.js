const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['UTILITY', 'MARKETING', 'AUTHENTICATION'],
    required: true
  },
  language: {
    type: String,
    default: 'en',
    trim: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'DISABLED'],
    default: 'PENDING'
  },
  components: [{
    type: {
      type: String,
      enum: ['HEADER', 'BODY', 'FOOTER', 'BUTTONS'],
      required: true
    },
    format: {
      type: String,
      enum: ['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT']
    },
    text: String,
    example: {
      header_text: [String],
      body_text: [String]
    },
    buttons: [{
      type: {
        type: String,
        enum: ['QUICK_REPLY', 'URL', 'PHONE_NUMBER']
      },
      text: String,
      url: String,
      phone_number: String
    }]
  }],
  whatsappTemplateId: String, // ID from WhatsApp Business API
  usage: {
    totalSent: {
      type: Number,
      default: 0
    },
    lastUsed: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
templateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for efficient queries
templateSchema.index({ userId: 1, status: 1 });
templateSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Template', templateSchema);
