# 🚀 Production Setup Instructions

## 1. WhatsApp Configuration (Choose One)

### Option A: Twilio WhatsApp (Recommended - No Restrictions!)
1. Sign up at https://console.twilio.com/
2. Get your Account SID and Auth Token
3. Enable WhatsApp Sandbox (free for testing)
4. Update .env.production with your Twilio credentials
5. No business verification needed!

### Option B: WhatsApp Business API Production
1. Apply for WhatsApp Business API at https://business.facebook.com/
2. Get production access (removes 24-hour restrictions)
3. Verify your business with Meta
4. Update .env.production with your credentials

## 2. Start Production Server

```bash
# Install PM2 globally
npm install -g pm2

# Start production server
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

## 3. Production Features

✅ **Unlimited Messaging** - Send to any WhatsApp number
✅ **No 24-hour restrictions** - Send anytime
✅ **Bulk messaging** - Send to thousands of contacts
✅ **Professional templates** - Approved message templates
✅ **Multi-client support** - Each client has separate data
✅ **Production monitoring** - PM2 process management

## 4. Domain Setup (Optional)

1. Point your domain to your server IP
2. Install SSL certificate (Let's Encrypt)
3. Update FRONTEND_URL in .env.production

## 5. Monitoring

```bash
# Check server status
pm2 status

# View logs
pm2 logs whatsapp-automation

# Restart server
pm2 restart whatsapp-automation
```

## 6. Backup

```bash
# Backup database
mongodump --db whatsapp_automation_prod --out ./backup

# Restore database
mongorestore --db whatsapp_automation_prod ./backup/whatsapp_automation_prod
```

Your WhatsApp Business Automation is now production-ready with unlimited messaging! 🎉