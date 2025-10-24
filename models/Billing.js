const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
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
  invoiceNumber: {
    type: String,
    unique: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  description: String,
  items: [{
    name: String,
    description: String,
    quantity: {
      type: Number,
      default: 1
    },
    unitPrice: Number,
    total: Number
  }],
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: Date,
  paymentMethod: String,
  paymentReference: String,
  reminders: [{
    sentAt: Date,
    type: {
      type: String,
      enum: ['whatsapp', 'email', 'sms']
    },
    status: {
      type: String,
      enum: ['sent', 'failed']
    }
  }],
  notes: String,
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
billingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Generate invoice number before saving
billingSchema.pre('save', function(next) {
  if (this.isNew && !this.invoiceNumber) {
    const timestamp = Date.now().toString().slice(-6);
    this.invoiceNumber = `INV-${timestamp}`;
  }
  next();
});

// Index for efficient queries
billingSchema.index({ userId: 1, status: 1 });
billingSchema.index({ userId: 1, dueDate: 1 });
billingSchema.index({ contactId: 1 });
billingSchema.index({ invoiceNumber: 1 });

module.exports = mongoose.model('Billing', billingSchema);
