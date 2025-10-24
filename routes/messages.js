const express = require('express');
const Message = require('../models/Message');
const Contact = require('../models/Contact');
const Template = require('../models/Template');
const WhatsAppService = require('../services/whatsappService');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const cron = require('node-cron');

const router = express.Router();

// Get all messages
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, contactId } = req.query;
    const query = { userId: req.user.userId };

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    if (contactId) {
      query.contactId = contactId;
    }

    const messages = await Message.find(query)
      .populate('contactId', 'name phone')
      .populate('templateId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments(query);

    res.json({
      messages,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send single message
router.post('/send', auth, async (req, res) => {
  try {
    const { contactId, type, content, templateId, templateData, scheduledFor } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user.whatsappConfig.isActive) {
      return res.status(400).json({ message: 'WhatsApp not configured' });
    }

    if (user.hasReachedLimit()) {
      return res.status(400).json({ message: 'Message limit reached' });
    }

    const contact = await Contact.findOne({
      _id: contactId,
      userId: req.user.userId
    });

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    const message = new Message({
      userId: req.user.userId,
      contactId,
      templateId,
      type,
      content: type === 'text' ? { text: content } : (content || {}),
      templateData,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null
    });

    await message.save();

    // Send immediately if not scheduled
    if (!scheduledFor) {
      await sendMessage(message, user, contact);
    }

    res.status(201).json({
      message: 'Message queued successfully',
      messageId: message._id
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send bulk messages
router.post('/bulk', auth, async (req, res) => {
  try {
    const { contacts, templateId, templateData, message, type, scheduledFor } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user.whatsappConfig.isActive) {
      return res.status(400).json({ message: 'WhatsApp not configured' });
    }

    if (user.hasReachedLimit(contacts.length)) {
      return res.status(400).json({ message: 'Message limit reached' });
    }

    const messages = [];
    const batchId = `batch_${Date.now()}`;

    for (const contactId of contacts) {
      const contact = await Contact.findOne({
        _id: contactId,
        userId: req.user.userId
      });

      if (contact) {
        const messageDoc = new Message({
          userId: req.user.userId,
          contactId,
          templateId,
          type,
          content: message,
          templateData,
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
          metadata: {
            batchId,
            campaignId: req.body.campaignId
          }
        });

        await messageDoc.save();
        messages.push(messageDoc);
      }
    }

    // Send immediately if not scheduled
    if (!scheduledFor) {
      await sendBulkMessages(messages, user);
    }

    res.status(201).json({
      message: 'Bulk messages queued successfully',
      batchId,
      count: messages.length
    });
  } catch (error) {
    console.error('Send bulk messages error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send template message
router.post('/template', auth, async (req, res) => {
  try {
    const { contactId, templateId, variables, scheduledFor } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user.whatsappConfig.isActive) {
      return res.status(400).json({ message: 'WhatsApp not configured' });
    }

    const template = await Template.findOne({
      _id: templateId,
      userId: req.user.userId
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Template not approved yet' });
    }

    const contact = await Contact.findOne({
      _id: contactId,
      userId: req.user.userId
    });

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    const message = new Message({
      userId: req.user.userId,
      contactId,
      templateId,
      type: 'template',
      templateData: {
        name: template.name,
        variables
      },
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null
    });

    await message.save();

    // Send immediately if not scheduled
    if (!scheduledFor) {
      await sendTemplateMessage(message, user, contact, template, variables);
    }

    res.status(201).json({
      message: 'Template message queued successfully',
      messageId: message._id
    });
  } catch (error) {
    console.error('Send template message error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get message status
router.get('/:id/status', auth, async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.json({
      message: {
        id: message._id,
        status: message.status,
        sentAt: message.sentAt,
        deliveredAt: message.deliveredAt,
        readAt: message.readAt,
        errorMessage: message.errorMessage
      }
    });
  } catch (error) {
    console.error('Get message status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel scheduled message
router.delete('/:id/cancel', auth, async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      { 
        _id: req.params.id, 
        userId: req.user.userId,
        status: 'pending'
      },
      { status: 'cancelled' },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: 'Message not found or already sent' });
    }

    res.json({ message: 'Message cancelled successfully' });
  } catch (error) {
    console.error('Cancel message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get message analytics
router.get('/analytics/overview', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { userId: req.user.userId };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await Message.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          read: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 };

    res.json({
      analytics: {
        total: result.total,
        sent: result.sent,
        delivered: result.delivered,
        read: result.read,
        failed: result.failed,
        deliveryRate: result.total > 0 ? ((result.delivered / result.total) * 100).toFixed(2) : 0,
        readRate: result.delivered > 0 ? ((result.read / result.delivered) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to send a single message
async function sendMessage(message, user, contact) {
  try {
    const whatsappService = new WhatsAppService(
      user.whatsappConfig.accessToken,
      user.whatsappConfig.phoneNumberId
    );

    let result;
    if (message.type === 'template') {
      const template = await Template.findById(message.templateId);
      result = await whatsappService.sendTemplateMessage(
        contact.phone,
        template.name,
        template.language,
        message.templateData.variables
      );
    } else if (message.type === 'text') {
      console.log('Debug - Message content:', message.content);
      console.log('Debug - Content type:', typeof message.content);
      console.log('Debug - Content text:', message.content?.text);
      result = await whatsappService.sendTextMessage(contact.phone, message.content?.text || message.content);
    } else if (message.type === 'image') {
      result = await whatsappService.sendMediaMessage(
        contact.phone,
        'image',
        message.content.mediaUrl,
        message.content.caption
      );
    }

    message.status = 'sent';
    message.sentAt = new Date();
    message.whatsappMessageId = result.messages[0].id;
    await message.save();

    // Increment user message usage
    await user.incrementMessageUsage();

  } catch (error) {
    message.status = 'failed';
    message.errorMessage = error.message;
    await message.save();
  }
}

// Helper function to send bulk messages
async function sendBulkMessages(messages, user) {
  const whatsappService = new WhatsAppService(
    user.whatsappConfig.accessToken,
    user.whatsappConfig.phoneNumberId
  );

  for (const message of messages) {
    try {
      const contact = await Contact.findById(message.contactId);
      await sendMessage(message, user, contact);
    } catch (error) {
      console.error('Bulk message error:', error);
    }
  }
}

// Helper function to send template message
async function sendTemplateMessage(message, user, contact, template, variables) {
  try {
    const whatsappService = new WhatsAppService(
      user.whatsappConfig.accessToken,
      user.whatsappConfig.phoneNumberId
    );

    const components = template.components.map(component => {
      if (component.type === 'BODY' && variables) {
        return {
          ...component,
          example: {
            body_text: variables
          }
        };
      }
      return component;
    });

    const result = await whatsappService.sendTemplateMessage(
      contact.phone,
      template.name,
      template.language,
      components
    );

    message.status = 'sent';
    message.sentAt = new Date();
    message.whatsappMessageId = result.messages[0].id;
    await message.save();

    // Increment user message usage
    await user.incrementMessageUsage();

  } catch (error) {
    message.status = 'failed';
    message.errorMessage = error.message;
    await message.save();
  }
}

// Schedule cron job for pending messages
cron.schedule('* * * * *', async () => {
  try {
    const pendingMessages = await Message.find({
      status: 'pending',
      scheduledFor: { $lte: new Date() }
    }).populate('contactId').populate('templateId');

    for (const message of pendingMessages) {
      const user = await User.findById(message.userId);
      if (user && user.whatsappConfig.isActive) {
        if (message.type === 'template') {
          await sendTemplateMessage(message, user, message.contactId, message.templateId, message.templateData.variables);
        } else {
          await sendMessage(message, user, message.contactId);
        }
      }
    }
  } catch (error) {
    console.error('Cron job error:', error);
  }
});

module.exports = router;
