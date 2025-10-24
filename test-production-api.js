#!/usr/bin/env node

/**
 * Test Production API with New WhatsApp Token
 */

const axios = require('axios');

const PRODUCTION_URL = 'https://whatsappemailautomation.onrender.com';
const NEW_TOKEN = 'EAAMCzsxNe3EBPZBoxkdTM8zmZCpm9eBxLKH6bPcHMmahwVrd56BaFC95oCRfSnGGsanpdwiZCxZBJsVVJ6nSmYZCLEQeFkwP4cIMXEMpZCGiB1jXB1xKh6FsuljInd3A7vth4oWXNS49wUwbQuDSZADJK3tPvKYZBBZA1LeyhUB5ZCmxmmyfhPyD8Kh5Rjs1f01dqEx0EI7Awm53qAPHuOggPHTUMWN2jIjGXZB27XE3WTRLWm3fQZDZD';

async function testProductionAPI() {
    console.log('🧪 Testing Production API with New WhatsApp Token\n');
    
    try {
        // Test 1: Register a new user
        console.log('👤 Testing User Registration...');
        const registerResponse = await axios.post(`${PRODUCTION_URL}/api/auth/register`, {
            name: 'WhatsApp Admin',
            email: 'admin@whatsappautomation.com',
            password: 'admin123456',
            whatsappConfig: {
                isActive: true,
                accessToken: NEW_TOKEN,
                phoneNumberId: '801520723049548',
                verifyToken: 'production_verify_token'
            }
        });
        
        console.log('✅ User Registration Success!');
        console.log('   Token:', registerResponse.data.token.substring(0, 30) + '...');
        
        const authToken = registerResponse.data.token;
        
        // Test 2: Test Contacts API
        console.log('\n📞 Testing Contacts API...');
        const contactsResponse = await axios.get(`${PRODUCTION_URL}/api/contacts`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        console.log('✅ Contacts API Working!');
        console.log('   Contacts count:', contactsResponse.data.length);
        
        // Test 3: Add a test contact
        console.log('\n➕ Testing Add Contact...');
        const addContactResponse = await axios.post(`${PRODUCTION_URL}/api/contacts`, {
            name: 'Test Contact',
            phoneNumber: '+1234567890',
            email: 'test@example.com'
        }, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        console.log('✅ Contact Added Successfully!');
        console.log('   Contact ID:', addContactResponse.data._id);
        
        // Test 4: Test Templates API
        console.log('\n📝 Testing Templates API...');
        const templatesResponse = await axios.get(`${PRODUCTION_URL}/api/templates`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        console.log('✅ Templates API Working!');
        console.log('   Templates count:', templatesResponse.data.length);
        
        // Test 5: Add a test template
        console.log('\n➕ Testing Add Template...');
        const addTemplateResponse = await axios.post(`${PRODUCTION_URL}/api/templates`, {
            name: 'test_template',
            category: 'UTILITY',
            language: 'en',
            components: [{
                type: 'BODY',
                text: 'Hello {{1}}, this is a test message!'
            }]
        }, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        console.log('✅ Template Added Successfully!');
        console.log('   Template ID:', addTemplateResponse.data._id);
        
        console.log('\n🎉 All API Tests Passed!');
        console.log('\n📋 Production Setup Complete:');
        console.log(`   🌐 URL: ${PRODUCTION_URL}`);
        console.log(`   🔑 Token: ${authToken.substring(0, 30)}...`);
        console.log(`   📱 WhatsApp: Connected`);
        console.log(`   👤 User: admin@whatsappautomation.com`);
        
        return authToken;
        
    } catch (error) {
        console.error('❌ API Test Failed:', error.response?.data || error.message);
        
        if (error.response?.status === 500) {
            console.log('\n🔧 Server Error - Possible Issues:');
            console.log('   - MongoDB connection issues on Render');
            console.log('   - Environment variables not set properly');
            console.log('   - Server not fully deployed yet');
        }
        
        return null;
    }
}

async function main() {
    console.log('🚀 WhatsApp Production API Test');
    console.log('=' .repeat(50));
    
    const token = await testProductionAPI();
    
    if (token) {
        console.log('\n✅ Production is ready!');
        console.log('🌐 Go to: https://whatsappemailautomation.onrender.com/');
        console.log('📧 Login with: admin@whatsappautomation.com / admin123456');
    } else {
        console.log('\n❌ Production needs fixing - check server logs');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testProductionAPI };
