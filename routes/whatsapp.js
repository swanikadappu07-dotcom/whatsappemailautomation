const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const axios = require('axios');

// Test WhatsApp API connection
router.get('/test', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user || !user.whatsappConfig || !user.whatsappConfig.accessToken) {
            return res.status(400).json({
                success: false,
                message: 'WhatsApp not configured'
            });
        }

        const { accessToken, phoneNumberId } = user.whatsappConfig;

        // Test the connection by getting phone number info
        const response = await axios.get(
            `https://graph.facebook.com/v18.0/${phoneNumberId}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        if (response.data) {
            res.json({
                success: true,
                message: 'WhatsApp API connection successful',
                data: response.data
            });
        } else {
            res.json({
                success: false,
                message: 'WhatsApp API connection failed'
            });
        }
    } catch (error) {
        console.error('WhatsApp test error:', error);
        res.status(500).json({
            success: false,
            message: 'WhatsApp API Error: ' + error.message
        });
    }
});

// Get phone numbers
router.get('/phone-numbers', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user || !user.whatsappConfig || !user.whatsappConfig.accessToken) {
            return res.status(400).json({
                message: 'WhatsApp not configured'
            });
        }

        const { accessToken } = user.whatsappConfig;

        // Get phone numbers from WhatsApp Business API
        const response = await axios.get(
            'https://graph.facebook.com/v18.0/me/phone_numbers',
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        const phoneNumbers = response.data.data.map(phone => phone.display_phone_number);
        
        res.json({
            phoneNumbers,
            message: 'Phone numbers retrieved successfully'
        });
    } catch (error) {
        console.error('Phone numbers error:', error);
        res.status(500).json({
            message: 'WhatsApp API Error: ' + error.message
        });
    }
});

// Get message templates
router.get('/templates', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user || !user.whatsappConfig || !user.whatsappConfig.accessToken) {
            return res.status(400).json({
                message: 'WhatsApp not configured'
            });
        }

        const { accessToken, phoneNumberId } = user.whatsappConfig;

        // Get message templates from WhatsApp Business API
        const response = await axios.get(
            `https://graph.facebook.com/v18.0/${phoneNumberId}/message_templates`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        res.json({
            templates: response.data.data,
            message: 'Templates retrieved successfully'
        });
    } catch (error) {
        console.error('Templates error:', error);
        res.status(500).json({
            message: 'WhatsApp API Error: ' + error.message
        });
    }
});

// Send test message
router.post('/send-test', auth, async (req, res) => {
    try {
        const { phoneNumber, message } = req.body;
        
        const user = await User.findById(req.user.userId);
        
        if (!user || !user.whatsappConfig || !user.whatsappConfig.accessToken) {
            return res.status(400).json({
                message: 'WhatsApp not configured'
            });
        }

        const { accessToken, phoneNumberId } = user.whatsappConfig;

        // Send test message via WhatsApp Business API
        const response = await axios.post(
            `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                to: phoneNumber,
                type: 'text',
                text: {
                    body: message || 'Hello! This is a test message from your WhatsApp Business automation system.'
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({
            success: true,
            message: 'Test message sent successfully',
            messageId: response.data.messages[0].id
        });
    } catch (error) {
        console.error('Send test message error:', error);
        res.status(500).json({
            message: 'WhatsApp API Error: ' + error.message
        });
    }
});

module.exports = router;
