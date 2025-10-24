const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Contact = require('../models/Contact');
const Message = require('../models/Message');
const User = require('../models/User');

// Send individual message via Twilio (UNLIMITED MESSAGING!)
router.post('/send', auth, async (req, res) => {
  try {
    const { to, message, type = 'text' } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ message: 'Phone number and message are required' });
    }

    // Get user's Twilio configuration
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize Twilio service with user's credentials
    const TwilioWhatsAppService = require('../services/twilioWhatsAppService');
    const twilioService = new TwilioWhatsAppService(
      user.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID,
      user.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN,
      user.twilioWhatsAppNumber || process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'
    );

    let result;
    if (type === 'text') {
      result = await twilioService.sendTextMessage(to, message);
    } else if (type === 'media') {
      result = await twilioService.sendMediaMessage(to, req.body.mediaUrl, message);
    }

    // Save message to database
    const messageRecord = new Message({
      userId: req.user.id,
      contactId: null, // Will be linked if contact exists
      content: { text: message },
      type: type,
      status: result.status || 'sent',
      messageId: result.messageId,
      sentAt: new Date()
    });

    await messageRecord.save();

    res.json({
      success: true,
      message: 'Message sent successfully via Twilio (UNLIMITED MESSAGING!)',
      messageId: result.messageId,
      status: result.status
    });

  } catch (error) {
    console.error('Twilio message error:', error);
    res.status(500).json({ 
      message: 'Failed to send message',
      error: error.message 
    });
  }
});

// Send bulk messages via Twilio (UNLIMITED MESSAGING!)
router.post('/bulk', auth, async (req, res) => {
  try {
    const { contacts, message, type = 'text' } = req.body;
    
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ message: 'Contacts array is required' });
    }

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Get user's Twilio configuration
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize Twilio service
    const TwilioWhatsAppService = require('../services/twilioWhatsAppService');
    const twilioService = new TwilioWhatsAppService(
      user.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID,
      user.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN,
      user.twilioWhatsAppNumber || process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'
    );

    const results = [];
    const errors = [];

    // Send to unlimited numbers (NO RESTRICTIONS!)
    for (const contact of contacts) {
      try {
        let result;
        if (type === 'text') {
          result = await twilioService.sendTextMessage(contact.phone, message);
        } else if (type === 'media') {
          result = await twilioService.sendMediaMessage(contact.phone, req.body.mediaUrl, message);
        }

        // Save message to database
        const messageRecord = new Message({
          userId: req.user.id,
          contactId: contact.id,
          content: { text: message },
          type: type,
          status: result.status || 'sent',
          messageId: result.messageId,
          sentAt: new Date()
        });

        await messageRecord.save();

        results.push({
          contactId: contact.id,
          phone: contact.phone,
          success: true,
          messageId: result.messageId
        });

      } catch (error) {
        errors.push({
          contactId: contact.id,
          phone: contact.phone,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk messages sent via Twilio! ${results.length} successful, ${errors.length} failed`,
      results,
      errors,
      totalSent: results.length,
      totalFailed: errors.length
    });

  } catch (error) {
    console.error('Twilio bulk message error:', error);
    res.status(500).json({ 
      message: 'Failed to send bulk messages',
      error: error.message 
    });
  }
});

// Send to unlimited numbers (NO RESTRICTIONS!)
router.post('/unlimited', auth, async (req, res) => {
  try {
    const { phoneNumbers, message, type = 'text' } = req.body;
    
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({ message: 'Phone numbers array is required' });
    }

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Get user's Twilio configuration
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize Twilio service
    const TwilioWhatsAppService = require('../services/twilioWhatsAppService');
    const twilioService = new TwilioWhatsAppService(
      user.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID,
      user.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN,
      user.twilioWhatsAppNumber || process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'
    );

    // Send to unlimited numbers (NO RESTRICTIONS!)
    const result = await twilioService.sendToUnlimitedNumbers(phoneNumbers, message);

    res.json({
      success: true,
      message: `UNLIMITED MESSAGING! Sent to ${result.results.length} numbers, ${result.errors.length} failed`,
      results: result.results,
      errors: result.errors,
      totalSent: result.results.length,
      totalFailed: result.errors.length
    });

  } catch (error) {
    console.error('Twilio unlimited messaging error:', error);
    res.status(500).json({ 
      message: 'Failed to send unlimited messages',
      error: error.message 
    });
  }
});

// Update user's Twilio configuration
router.post('/configure-twilio', auth, async (req, res) => {
  try {
    const { accountSid, authToken, whatsappNumber } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update Twilio configuration
    user.twilioAccountSid = accountSid;
    user.twilioAuthToken = authToken;
    user.twilioWhatsAppNumber = whatsappNumber;

    await user.save();

    res.json({
      success: true,
      message: 'Twilio configuration updated successfully!',
      twilioConfigured: true
    });

  } catch (error) {
    console.error('Twilio configuration error:', error);
    res.status(500).json({ 
      message: 'Failed to update Twilio configuration',
      error: error.message 
    });
  }
});

module.exports = router;
