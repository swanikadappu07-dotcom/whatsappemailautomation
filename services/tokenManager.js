const axios = require('axios');
const User = require('../models/User');

class TokenManager {
    constructor() {
        this.checkInterval = 24 * 60 * 60 * 1000; // Check daily
        this.warningDays = 7; // Warn 7 days before expiry
    }

    // Start monitoring tokens
    startMonitoring() {
        console.log('🔄 Starting WhatsApp token monitoring...');
        setInterval(() => {
            this.checkAllTokens();
        }, this.checkInterval);
        
        // Initial check
        this.checkAllTokens();
    }

    // Check all user tokens
    async checkAllTokens() {
        try {
            const users = await User.find({ 
                'whatsappConfig.isActive': true,
                'whatsappConfig.accessToken': { $exists: true }
            });

            for (const user of users) {
                await this.checkUserToken(user);
            }
        } catch (error) {
            console.error('❌ Error checking tokens:', error);
        }
    }

    // Check individual user token
    async checkUserToken(user) {
        try {
            const { accessToken, phoneNumberId } = user.whatsappConfig;
            
            // Test token validity
            const response = await axios.get(
                `https://graph.facebook.com/v18.0/${phoneNumberId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    },
                    timeout: 10000
                }
            );

            if (response.data && response.data.id === phoneNumberId) {
                console.log(`✅ Token valid for user: ${user.email}`);
                return { valid: true };
            }
        } catch (error) {
            console.log(`❌ Token expired for user: ${user.email}`);
            
            // Update user status
            user.whatsappConfig.isActive = false;
            user.whatsappConfig.lastError = 'Token expired';
            user.whatsappConfig.lastChecked = new Date();
            await user.save();

            // Send notification (implement your notification system)
            await this.sendTokenExpiredNotification(user);
            
            return { valid: false, error: error.message };
        }
    }

    // Send notification when token expires
    async sendTokenExpiredNotification(user) {
        console.log(`📧 Sending token expiry notification to: ${user.email}`);
        
        // Implement your notification system here:
        // - Email notification
        // - SMS alert
        // - Dashboard notification
        // - Slack/Discord webhook
        
        // Example email notification (you'll need to implement email service)
        /*
        const emailService = require('./emailService');
        await emailService.send({
            to: user.email,
            subject: 'WhatsApp Token Expired - Action Required',
            template: 'token-expired',
            data: {
                userName: user.name,
                expiryDate: new Date().toLocaleDateString(),
                updateUrl: `${process.env.FRONTEND_URL}/settings`
            }
        });
        */
    }

    // Manual token update
    async updateUserToken(userId, newToken) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Test new token
            const testResult = await this.testToken(newToken, user.whatsappConfig.phoneNumberId);
            
            if (testResult.valid) {
                // Update token
                user.whatsappConfig.accessToken = newToken;
                user.whatsappConfig.isActive = true;
                user.whatsappConfig.lastUpdated = new Date();
                user.whatsappConfig.lastError = null;
                await user.save();

                console.log(`✅ Token updated successfully for user: ${user.email}`);
                return { success: true, message: 'Token updated successfully' };
            } else {
                throw new Error('Invalid token provided');
            }
        } catch (error) {
            console.error('❌ Error updating token:', error);
            return { success: false, error: error.message };
        }
    }

    // Test token validity
    async testToken(token, phoneNumberId) {
        try {
            const response = await axios.get(
                `https://graph.facebook.com/v18.0/${phoneNumberId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    timeout: 10000
                }
            );

            return { 
                valid: response.data && response.data.id === phoneNumberId,
                data: response.data 
            };
        } catch (error) {
            return { 
                valid: false, 
                error: error.response?.data?.error?.message || error.message 
            };
        }
    }

    // Get token status for dashboard
    async getTokenStatus(userId) {
        try {
            const user = await User.findById(userId);
            if (!user || !user.whatsappConfig.accessToken) {
                return { status: 'not_configured' };
            }

            const testResult = await this.testToken(
                user.whatsappConfig.accessToken, 
                user.whatsappConfig.phoneNumberId
            );

            return {
                status: testResult.valid ? 'active' : 'expired',
                lastChecked: user.whatsappConfig.lastChecked,
                lastError: user.whatsappConfig.lastError,
                isActive: user.whatsappConfig.isActive
            };
        } catch (error) {
            return { status: 'error', error: error.message };
        }
    }
}

module.exports = new TokenManager();
