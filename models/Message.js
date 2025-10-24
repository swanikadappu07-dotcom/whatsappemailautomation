const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template'
  },
  type: {
    type: String,
    enum: ['template', 'text', 'image', 'document', 'bulk'],
    required: true
  },
  content: {
    text: String,
    mediaUrl: String,
    mediaType: String,
    fileName: String
  },
  templateData: {
    name: String,
    variables: [String] // Dynamic variables for template
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending'
  },
  whatsappMessageId: String,
  errorMessage: String,
  scheduledFor: Date,
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  cost: {
    type: Number,
    default: 0
  },
  metadata: {
    campaignId: String,
    batchId: String,
    retryCount: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
messageSchema.index({ userId: 1, status: 1 });
messageSchema.index({ userId: 1, scheduledFor: 1 });
messageSchema.index({ contactId: 1 });
messageSchema.index({ whatsappMessageId: 1 });

module.exports = mongoose.model('Message', messageSchema);
