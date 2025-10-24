const axios = require('axios');

const ACCESS_TOKEN = 'EAAMCzsxNe3EBPZBlAoHs0B1Ieo4sAJJXuZCMHAdUcqZBKLe3CQ7Ebz0ZBKNcMEleDuVktYMZARFsjZCM3jl2GRb0DLTz3kI3AR7XUS9IHDCsZBGZAG0VLZATSldho5HkPxAYFroaOagJZANN1eZA4M0jXnzJIH4ZCEk3heiNLuUQyk86Iv03LQYHtBnQCT8bVi63efIdaVUihYuMeao4llMuxuWpaPXrPds0lkNuCRH3aOjAvG1CZAAZDZD';
const PHONE_NUMBER_ID = '801520723049548';

async function testWhatsAppConfig() {
  try {
    console.log('🧪 Testing WhatsApp Business API Configuration...\n');
    
    // Test 1: Check phone number info
    console.log('📱 Testing Phone Number Info...');
    const phoneResponse = await axios.get(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });
    
    console.log('✅ Phone Number Details:');
    console.log(`   Display Number: ${phoneResponse.data.display_phone_number}`);
    console.log(`   Quality Rating: ${phoneResponse.data.quality_rating || 'Not rated'}`);
    console.log(`   Status: ${phoneResponse.data.status || 'Active'}`);
    console.log('');

    // Test 2: Send a test message
    console.log('📤 Testing Message Sending...');
    const testMessage = {
      messaging_product: 'whatsapp',
      to: '+15551629033', // Your test number
      type: 'text',
      text: {
        body: 'Hello! This is a test message from your WhatsApp Business Automation Platform. 🚀'
      }
    };

    const messageResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      testMessage,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Test Message Sent Successfully!');
    console.log(`   Message ID: ${messageResponse.data.messages[0].id}`);
    console.log(`   Status: ${messageResponse.data.messages[0].message_status}`);
    console.log('');

    console.log('🎉 WhatsApp Business API is working perfectly!');
    console.log('You can now:');
    console.log('1. Send messages to your contacts');
    console.log('2. Create message templates');
    console.log('3. Set up automated workflows');
    console.log('4. Use the full automation platform');

  } catch (error) {
    console.error('❌ Error testing WhatsApp API:', error.response?.data || error.message);
    
    if (error.response?.data?.error) {
      const errorData = error.response.data.error;
      console.log('\n💡 Troubleshooting:');
      console.log(`   Error Code: ${errorData.code}`);
      console.log(`   Error Type: ${errorData.type}`);
      console.log(`   Message: ${errorData.message}`);
      
      if (errorData.code === 100) {
        console.log('\n🔧 This usually means:');
        console.log('   - Your access token needs more permissions');
        console.log('   - The phone number ID might be incorrect');
        console.log('   - Your WhatsApp Business account needs verification');
      }
    }
  }
}

testWhatsAppConfig();
