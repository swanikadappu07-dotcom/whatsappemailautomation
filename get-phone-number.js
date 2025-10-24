const axios = require('axios');

const ACCESS_TOKEN = 'EAAMCzsxNe3EBPZBlAoHs0B1Ieo4sAJJXuZCMHAdUcqZBKLe3CQ7Ebz0ZBKNcMEleDuVktYMZARFsjZCM3jl2GRb0DLTz3kI3AR7XUS9IHDCsZBGZAG0VLZATSldho5HkPxAYFroaOagJZANN1eZA4M0jXnzJIH4ZCEk3heiNLuUQyk86Iv03LQYHtBnQCT8bVi63efIdaVUihYuMeao4llMuxuWpaPXrPds0lkNuCRH3aOjAvG1CZAAZDZD';

async function getPhoneNumbers() {
  try {
    console.log('🔍 Checking your WhatsApp Business API access...\n');
    
    // First, let's check what we can access
    const meResponse = await axios.get('https://graph.facebook.com/v18.0/me', {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });

    console.log('✅ Account Info:');
    console.log(`   Name: ${meResponse.data.name}`);
    console.log(`   ID: ${meResponse.data.id}`);
    console.log('');

    // Try to get WhatsApp Business accounts
    try {
      const businessResponse = await axios.get('https://graph.facebook.com/v18.0/me/businesses', {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      });

      console.log('🏢 Business Accounts:');
      businessResponse.data.data.forEach((business, index) => {
        console.log(`${index + 1}. ${business.name} (ID: ${business.id})`);
      });
      console.log('');

      // Try to get WhatsApp accounts
      if (businessResponse.data.data.length > 0) {
        const businessId = businessResponse.data.data[0].id;
        
        try {
          const whatsappResponse = await axios.get(`https://graph.facebook.com/v18.0/${businessId}/owned_whatsapp_business_accounts`, {
            headers: {
              'Authorization': `Bearer ${ACCESS_TOKEN}`
            }
          });

          console.log('📱 WhatsApp Business Accounts:');
          whatsappResponse.data.data.forEach((account, index) => {
            console.log(`${index + 1}. Account ID: ${account.id}`);
            console.log(`   Name: ${account.name}`);
            console.log(`   Status: ${account.verification_status}`);
            console.log('');
          });

          // Try to get phone numbers from the first WhatsApp account
          if (whatsappResponse.data.data.length > 0) {
            const accountId = whatsappResponse.data.data[0].id;
            
            try {
              const phoneResponse = await axios.get(`https://graph.facebook.com/v18.0/${accountId}/phone_numbers`, {
                headers: {
                  'Authorization': `Bearer ${ACCESS_TOKEN}`
                }
              });

              console.log('📞 Phone Numbers:');
              phoneResponse.data.data.forEach((phone, index) => {
                console.log(`${index + 1}. Phone Number ID: ${phone.id}`);
                console.log(`   Display: ${phone.display_phone_number}`);
                console.log(`   Verified: ${phone.verified_name || 'Not verified'}`);
                console.log('');
              });

              if (phoneResponse.data.data.length > 0) {
                const firstPhone = phoneResponse.data.data[0];
                console.log('🎯 Use this Phone Number ID:');
                console.log(`   ${firstPhone.id}`);
                console.log(`   Display: ${firstPhone.display_phone_number}`);
              }

            } catch (phoneError) {
              console.log('❌ Could not fetch phone numbers:', phoneError.response?.data?.error?.message || phoneError.message);
            }
          }

        } catch (whatsappError) {
          console.log('❌ Could not fetch WhatsApp accounts:', whatsappError.response?.data?.error?.message || whatsappError.message);
        }
      }

    } catch (businessError) {
      console.log('❌ Could not fetch business accounts:', businessError.response?.data?.error?.message || businessError.message);
      console.log('\n💡 You might need to:');
      console.log('1. Make sure your app has the right permissions');
      console.log('2. Check if your WhatsApp Business account is properly set up');
      console.log('3. Verify your access token has the necessary scopes');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

getPhoneNumbers();