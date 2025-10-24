#!/usr/bin/env node

/**
 * WhatsApp Business API Configuration Script
 * This script helps configure WhatsApp API credentials for production
 */

const axios = require('axios');

// Your WhatsApp Business API credentials
const WHATSAPP_CONFIG = {
    accessToken: 'EAAMCzsxNe3EBPZBoxkdTM8zmZCpm9eBxLKH6bPcHMmahwVrd56BaFC95oCRfSnGGsanpdwiZCxZBJsVVJ6nSmYZCLEQeFkwP4cIMXEMpZCGiB1jXB1xKh6FsuljInd3A7vth4oWXNS49wUwbQuDSZADJK3tPvKYZBBZA1LeyhUB5ZCmxmmyfhPyD8Kh5Rjs1f01dqEx0EI7Awm53qAPHuOggPHTUMWN2jIjGXZB27XE3WTRLWm3fQZDZD',
    phoneNumberId: '801520723049548',
    verifyToken: 'whatsapp_verify_token_2024',
    webhookUrl: 'https://whatsappemailautomation.onrender.com/api/webhook'
};

async function testWhatsAppAPI() {
    console.log('🔍 Testing WhatsApp Business API Connection...\n');
    
    try {
        // Test 1: Get Phone Number Info
        console.log('📱 Testing Phone Number Info...');
        const phoneResponse = await axios.get(
            `https://graph.facebook.com/v18.0/${WHATSAPP_CONFIG.phoneNumberId}`,
            {
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_CONFIG.accessToken}`
                }
            }
        );
        
        console.log('✅ Phone Number Info:', {
            id: phoneResponse.data.id,
            display_phone_number: phoneResponse.data.display_phone_number,
            verified_name: phoneResponse.data.verified_name
        });
        
        // Test 2: Get Business Profile
        console.log('\n🏢 Testing Business Profile...');
        const businessResponse = await axios.get(
            `https://graph.facebook.com/v18.0/${WHATSAPP_CONFIG.phoneNumberId}/whatsapp_business_profile`,
            {
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_CONFIG.accessToken}`
                }
            }
        );
        
        console.log('✅ Business Profile:', {
            about: businessResponse.data.about,
            address: businessResponse.data.address,
            description: businessResponse.data.description,
            email: businessResponse.data.email,
            website: businessResponse.data.website
        });
        
        // Test 3: Get Message Templates
        console.log('\n📝 Testing Message Templates...');
        const templatesResponse = await axios.get(
            `https://graph.facebook.com/v18.0/${WHATSAPP_CONFIG.phoneNumberId}/message_templates`,
            {
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_CONFIG.accessToken}`
                }
            }
        );
        
        console.log('✅ Available Templates:', templatesResponse.data.data.length);
        templatesResponse.data.data.forEach((template, index) => {
            console.log(`   ${index + 1}. ${template.name} (${template.status})`);
        });
        
        console.log('\n🎉 WhatsApp Business API is working perfectly!');
        console.log('\n📋 Configuration Summary:');
        console.log(`   Access Token: ${WHATSAPP_CONFIG.accessToken.substring(0, 20)}...`);
        console.log(`   Phone Number ID: ${WHATSAPP_CONFIG.phoneNumberId}`);
        console.log(`   Verify Token: ${WHATSAPP_CONFIG.verifyToken}`);
        console.log(`   Webhook URL: ${WHATSAPP_CONFIG.webhookUrl}`);
        
    } catch (error) {
        console.error('❌ WhatsApp API Error:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('\n🔑 Authentication Error:');
            console.log('   - Your access token may be expired');
            console.log('   - Please get a new access token from Facebook Developer Console');
            console.log('   - Go to: https://developers.facebook.com/apps/');
        }
        
        if (error.response?.status === 403) {
            console.log('\n🚫 Permission Error:');
            console.log('   - Your app may not have the required permissions');
            console.log('   - Make sure you have whatsapp_business_management and whatsapp_business_messaging permissions');
        }
    }
}

async function createTestUser() {
    console.log('\n👤 Creating Test User for Production...');
    
    try {
        const response = await axios.post('https://whatsappemailautomation.onrender.com/api/auth/register', {
            name: 'WhatsApp Admin',
            email: 'admin@whatsappautomation.com',
            password: 'admin123456',
            whatsappConfig: {
                isActive: true,
                accessToken: WHATSAPP_CONFIG.accessToken,
                phoneNumberId: WHATSAPP_CONFIG.phoneNumberId,
                verifyToken: WHATSAPP_CONFIG.verifyToken
            }
        });
        
        console.log('✅ Test user created successfully!');
        console.log('   Token:', response.data.token.substring(0, 20) + '...');
        
        return response.data.token;
    } catch (error) {
        console.error('❌ User Creation Error:', error.response?.data || error.message);
        return null;
    }
}

async function main() {
    console.log('🚀 WhatsApp Business API Configuration\n');
    console.log('=' .repeat(50));
    
    // Test WhatsApp API
    await testWhatsAppAPI();
    
    // Create test user
    await createTestUser();
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Configuration complete!');
    console.log('\n🌐 Next Steps:');
    console.log('1. Go to https://whatsappemailautomation.onrender.com/');
    console.log('2. Register with your email and password');
    console.log('3. Add your WhatsApp API credentials in Settings');
    console.log('4. Start adding contacts and sending messages!');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { WHATSAPP_CONFIG, testWhatsAppAPI, createTestUser };
