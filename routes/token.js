const express = require('express');
const { auth } = require('../middleware/auth');
const tokenManager = require('../services/tokenManager');
const User = require('../models/User');

const router = express.Router();

// Get token status
router.get('/status', auth, async (req, res) => {
    try {
        const status = await tokenManager.getTokenStatus(req.user.userId);
        res.json(status);
    } catch (error) {
        console.error('Token status error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update token
router.post('/update', auth, async (req, res) => {
    try {
        const { accessToken } = req.body;
        
        if (!accessToken) {
            return res.status(400).json({ message: 'Access token is required' });
        }

        const result = await tokenManager.updateUserToken(req.user.userId, accessToken);
        
        if (result.success) {
            res.json({ 
                message: 'Token updated successfully',
                status: 'active'
            });
        } else {
            res.status(400).json({ 
                message: 'Failed to update token',
                error: result.error
            });
        }
    } catch (error) {
        console.error('Token update error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Test token
router.post('/test', auth, async (req, res) => {
    try {
        const { accessToken } = req.body;
        
        if (!accessToken) {
            return res.status(400).json({ message: 'Access token is required' });
        }

        const user = await User.findById(req.user.userId);
        if (!user || !user.whatsappConfig.phoneNumberId) {
            return res.status(400).json({ message: 'WhatsApp not configured' });
        }

        const testResult = await tokenManager.testToken(accessToken, user.whatsappConfig.phoneNumberId);
        
        res.json({
            valid: testResult.valid,
            message: testResult.valid ? 'Token is valid' : 'Token is invalid',
            error: testResult.error
        });
    } catch (error) {
        console.error('Token test error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get token info (for debugging)
router.get('/info', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user || !user.whatsappConfig) {
            return res.status(404).json({ message: 'WhatsApp not configured' });
        }

        res.json({
            isActive: user.whatsappConfig.isActive,
            lastUpdated: user.whatsappConfig.lastUpdated,
            lastChecked: user.whatsappConfig.lastChecked,
            lastError: user.whatsappConfig.lastError,
            phoneNumberId: user.whatsappConfig.phoneNumberId
        });
    } catch (error) {
        console.error('Token info error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
