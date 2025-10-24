const express = require('express');
const Message = require('../models/Message');
const Contact = require('../models/Contact');
const User = require('../models/User');

const router = express.Router();

// Verify webhook
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    console.log('Webhook verification failed');
    res.status(403).send('Forbidden');
  }
});

// Handle incoming messages
router.post('/', async (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            const messages = change.value.messages;
            const statuses = change.value.statuses;

            // Handle incoming messages
            if (messages) {
              for (const message of messages) {
                await handleIncomingMessage(message, change.value.metadata);
              }
            }

            // Handle message status updates
            if (statuses) {
              for (const status of statuses) {
                await handleMessageStatus(status);
              }
            }
          }
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

// Handle incoming messages
async function handleIncomingMessage(message, metadata) {
  try {
    const phoneNumber = message.from;
    const messageText = message.text?.body || '';
    const messageType = message.type;

    // Find contact by phone number
    const contact = await Contact.findOne({ phone: phoneNumber });
    if (!contact) {
      console.log('Contact not found for phone:', phoneNumber);
      return;
    }

    // Update contact's last contact time
    contact.lastContact = new Date();
    await contact.save();

    // Log the incoming message
    const messageLog = new Message({
      userId: contact.userId,
      contactId: contact._id,
      type: 'incoming',
      content: {
        text: messageText,
        messageType: messageType
      },
      status: 'received',
      whatsappMessageId: message.id,
      sentAt: new Date()
    });

    await messageLog.save();

    // Handle different message types
    if (messageType === 'text') {
      await handleTextMessage(messageText, contact);
    } else if (messageType === 'image') {
      await handleImageMessage(message, contact);
    } else if (messageType === 'document') {
      await handleDocumentMessage(message, contact);
    }

  } catch (error) {
    console.error('Handle incoming message error:', error);
  }
}

// Handle message status updates
async function handleMessageStatus(status) {
  try {
    const message = await Message.findOne({
      whatsappMessageId: status.id
    });

    if (message) {
      message.status = status.status;
      
      if (status.status === 'delivered') {
        message.deliveredAt = new Date();
      } else if (status.status === 'read') {
        message.readAt = new Date();
      }

      await message.save();
    }
  } catch (error) {
    console.error('Handle message status error:', error);
  }
}

// Handle text messages
async function handleTextMessage(messageText, contact) {
  try {
    const user = await User.findById(contact.userId);
    if (!user.whatsappConfig.isActive) return;

    // Simple auto-reply logic
    const lowerText = messageText.toLowerCase();
    
    if (lowerText.includes('hello') || lowerText.includes('hi')) {
      await sendAutoReply(contact, 'Hello! How can I help you today?');
    } else if (lowerText.includes('appointment')) {
      await sendAutoReply(contact, 'To book an appointment, please call us or visit our website.');
    } else if (lowerText.includes('bill') || lowerText.includes('payment')) {
      await sendAutoReply(contact, 'For billing inquiries, please contact our billing department.');
    } else if (lowerText.includes('cancel')) {
      await sendAutoReply(contact, 'To cancel your appointment, please call us at least 24 hours in advance.');
    } else {
      await sendAutoReply(contact, 'Thank you for your message. We will get back to you soon.');
    }

  } catch (error) {
    console.error('Handle text message error:', error);
  }
}

// Handle image messages
async function handleImageMessage(message, contact) {
  try {
    await sendAutoReply(contact, 'Thank you for sharing the image. We will review it and get back to you.');
  } catch (error) {
    console.error('Handle image message error:', error);
  }
}

// Handle document messages
async function handleDocumentMessage(message, contact) {
  try {
    await sendAutoReply(contact, 'Thank you for sharing the document. We will review it and get back to you.');
  } catch (error) {
    console.error('Handle document message error:', error);
  }
}

// Send auto-reply
async function sendAutoReply(contact, replyText) {
  try {
    const user = await User.findById(contact.userId);
    if (!user.whatsappConfig.isActive) return;

    const WhatsAppService = require('../services/whatsappService');
    const whatsappService = new WhatsAppService(
      user.whatsappConfig.accessToken,
      user.whatsappConfig.phoneNumberId
    );

    await whatsappService.sendTextMessage(contact.phone, replyText);

    // Log the auto-reply
    const messageLog = new Message({
      userId: contact.userId,
      contactId: contact._id,
      type: 'text',
      content: { text: replyText },
      status: 'sent',
      sentAt: new Date(),
      metadata: {
        isAutoReply: true
      }
    });

    await messageLog.save();

  } catch (error) {
    console.error('Send auto-reply error:', error);
  }
}

module.exports = router;
