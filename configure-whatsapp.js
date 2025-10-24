const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 WhatsApp Business API Configuration');
console.log('=====================================\n');

console.log('To get your WhatsApp Business API credentials:');
console.log('1. Go to https://business.facebook.com/');
console.log('2. Create a Business Account');
console.log('3. Go to WhatsApp Business API section');
console.log('4. Get your credentials from there\n');

async function configureWhatsApp() {
  try {
    console.log('Enter your WhatsApp Business API credentials:\n');
    
    const accessToken = await question('WhatsApp Access Token (starts with EAA...): ');
    const phoneNumberId = await question('Phone Number ID (numeric): ');
    const verifyToken = await question('Verify Token (create a secure token): ');
    
    // Read current .env file
    let envContent = fs.readFileSync('.env', 'utf8');
    
    // Update the values
    envContent = envContent.replace('WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token', `WHATSAPP_ACCESS_TOKEN=${accessToken}`);
    envContent = envContent.replace('WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id', `WHATSAPP_PHONE_NUMBER_ID=${phoneNumberId}`);
    envContent = envContent.replace('WHATSAPP_VERIFY_TOKEN=your_verify_token', `WHATSAPP_VERIFY_TOKEN=${verifyToken}`);
    envContent = envContent.replace('WHATSAPP_WEBHOOK_URL=https://yourdomain.com/webhook', `WHATSAPP_WEBHOOK_URL=http://localhost:3001/api/webhook`);
    
    // Write updated .env file
    fs.writeFileSync('.env', envContent);
    
    console.log('\n✅ WhatsApp configuration updated successfully!');
    console.log('\nNext steps:');
    console.log('1. Restart your server: npm start');
    console.log('2. Test the configuration with: node test-whatsapp.js');
    console.log('3. Set up webhook in Meta Business Manager');
    
  } catch (error) {
    console.error('❌ Error configuring WhatsApp:', error.message);
  } finally {
    rl.close();
  }
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

configureWhatsApp();
