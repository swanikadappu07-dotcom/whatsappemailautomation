# WhatsApp Business API Setup Guide

## 🔗 WhatsApp Connection Details

### 1. **WhatsApp Business API Credentials**

You need these credentials to connect your WhatsApp Business account:

#### **Access Token**
```
EAAMCzsxNe3EBPZBoxkdTM8zmZCpm9eBxLKH6bPcHMmahwVrd56BaFC95oCRfSnGGsanpdwiZCxZBJsVVJ6nSmYZCLEQeFkwP4cIMXEMpZCGiB1jXB1xKh6FsuljInd3A7vth4oWXNS49wUwbQuDSZADJK3tPvKYZBBZA1LeyhUB5ZCmxmmyfhPyD8Kh5Rjs1f01dqEx0EI7Awm53qAPHuOggPHTUMWN2jIjGXZB27XE3WTRLWm3fQZDZD
```

#### **Phone Number ID**
```
801520723049548
```

#### **Verify Token** (for webhooks)
```
whatsapp_verify_token_2024
```

### 2. **How to Get Your WhatsApp Business API Credentials**

#### **Step 1: Go to Meta for Developers**
1. Visit: https://developers.facebook.com/
2. Log in with your Facebook account
3. Click "My Apps" → "Create App"

#### **Step 2: Create a WhatsApp Business App**
1. Choose "Business" as app type
2. Enter app name (e.g., "My WhatsApp Automation")
3. Add your email and business account

#### **Step 3: Add WhatsApp Product**
1. In your app dashboard, click "Add Product"
2. Find "WhatsApp" and click "Set up"
3. Follow the setup wizard

#### **Step 4: Get Your Credentials**

**Access Token:**
1. Go to WhatsApp → API Setup
2. Copy the "Temporary access token" (for testing)
3. For production, create a "System User" with permanent token

**Phone Number ID:**
1. In WhatsApp → API Setup
2. Find your phone number
3. Copy the "Phone number ID"

**Webhook URL:**
```
https://whatsappemailautomation.onrender.com/api/webhook
```

**Webhook Verify Token:**
Create a custom token (e.g., `whatsapp_verify_token_2024`)

### 3. **Environment Variables Setup**

#### **For Local Development (.env file):**
```bash
MONGODB_URI=mongodb://localhost:27017/whatsapp_automation
JWT_SECRET=your_super_secret_jwt_key_here
WHATSAPP_ACCESS_TOKEN=EAAMCzsxNe3EBPZBoxkdTM8zmZCpm9eBxLKH6bPcHMmahwVrd56BaFC95oCRfSnGGsanpdwiZCxZBJsVVJ6nSmYZCLEQeFkwP4cIMXEMpZCGiB1jXB1xKh6FsuljInd3A7vth4oWXNS49wUwbQuDSZADJK3tPvKYZBBZA1LeyhUB5ZCmxmmyfhPyD8Kh5Rjs1f01dqEx0EI7Awm53qAPHuOggPHTUMWN2jIjGXZB27XE3WTRLWm3fQZDZD
WHATSAPP_PHONE_NUMBER_ID=801520723049548
WHATSAPP_VERIFY_TOKEN=whatsapp_verify_token_2024
WHATSAPP_WEBHOOK_URL=https://whatsappemailautomation.onrender.com/api/webhook
PORT=3001
NODE_ENV=development
```

#### **For Render Production:**
Set these in your Render dashboard under "Environment":

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/whatsapp_automation
JWT_SECRET=your_super_secret_jwt_key_here
WHATSAPP_ACCESS_TOKEN=EAAMCzsxNe3EBPZBoxkdTM8zmZCpm9eBxLKH6bPcHMmahwVrd56BaFC95oCRfSnGGsanpdwiZCxZBJsVVJ6nSmYZCLEQeFkwP4cIMXEMpZCGiB1jXB1xKh6FsuljInd3A7vth4oWXNS49wUwbQuDSZADJK3tPvKYZBBZA1LeyhUB5ZCmxmmyfhPyD8Kh5Rjs1f01dqEx0EI7Awm53qAPHuOggPHTUMWN2jIjGXZB27XE3WTRLWm3fQZDZD
WHATSAPP_PHONE_NUMBER_ID=801520723049548
WHATSAPP_VERIFY_TOKEN=whatsapp_verify_token_2024
WHATSAPP_WEBHOOK_URL=https://whatsappemailautomation.onrender.com/api/webhook
NODE_ENV=production
```

### 4. **WhatsApp Business API Setup Steps**

#### **Step 1: Configure Webhook**
1. Go to WhatsApp → Configuration
2. Set Webhook URL: `https://whatsappemailautomation.onrender.com/api/webhook`
3. Set Verify Token: `whatsapp_verify_token_2024`
4. Subscribe to `messages` events
5. Click "Verify and Save"

#### **Step 2: Test Your Setup**
1. Send a test message from your personal WhatsApp to your business number
2. Check if the webhook receives the message
3. Try sending a message from your app

#### **Step 3: Create Message Templates**
1. Go to WhatsApp → Message Templates
2. Click "Create Template"
3. Choose template type (e.g., "Text", "Media")
4. Fill in template details
5. Submit for approval

### 5. **Common Issues & Solutions**

#### **Issue: "Recipient phone number not in allowed list"**
**Solution:** For test accounts, you need to add recipient numbers to the allowed list:
1. Go to WhatsApp → API Setup
2. Find "Recipients" section
3. Add phone numbers you want to send messages to

#### **Issue: "Template not approved yet"**
**Solution:** Message templates need Meta approval:
1. Create template in WhatsApp Business Manager
2. Wait for approval (usually 24-48 hours)
3. Use approved templates only

#### **Issue: "Session has expired"**
**Solution:** Access tokens expire:
1. Generate new access token
2. Update your environment variables
3. Restart your application

### 6. **Testing Your Connection**

#### **Test 1: Health Check**
```bash
curl https://whatsappemailautomation.onrender.com/health
```

#### **Test 2: Send Test Message**
Use the app's "Quick Actions" → "Send Message" feature

#### **Test 3: Check Webhook**
Send a message to your business number and check if it's received

### 7. **Production vs Test Account**

#### **Test Account (Current)**
- ✅ Free to use
- ❌ Limited to 1000 messages/month
- ❌ Recipients must be in allowed list
- ❌ 24-hour messaging window only

#### **Production Account (Recommended)**
- ✅ Unlimited messaging
- ✅ No recipient restrictions
- ✅ No time limitations
- ❌ Requires business verification
- ❌ Costs money per message

### 8. **Next Steps**

1. **Set up environment variables** in Render
2. **Configure webhook** in WhatsApp Business Manager
3. **Test the connection** using the app
4. **Create message templates** for your campaigns
5. **Add contacts** and start sending messages

## 🎉 You're All Set!

Your WhatsApp Business API is now configured and ready to use with your automation platform!
