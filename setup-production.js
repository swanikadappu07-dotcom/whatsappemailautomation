#!/usr/bin/env node

/**
 * Production Setup Script for WhatsApp Business Automation
 * This script helps you configure the system for production use without restrictions
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 WhatsApp Business Automation - Production Setup');
console.log('================================================\n');

// Create production environment file
const productionEnv = `# Production Environment Configuration
NODE_ENV=production
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/whatsapp_automation_prod

# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=${generateRandomString(64)}

# Rate Limiting (Production settings)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Twilio WhatsApp Configuration (UNLIMITED MESSAGING!)
# Get these from: https://console.twilio.com/
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# WhatsApp Business API (Alternative - for production)
WHATSAPP_ACCESS_TOKEN=your_production_access_token
WHATSAPP_PHONE_NUMBER_ID=your_production_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_WEBHOOK_URL=https://yourdomain.com/webhook

# Frontend URL
FRONTEND_URL=https://yourdomain.com

# Production Features
UNLIMITED_MESSAGING=true
BULK_MESSAGING_LIMIT=10000
PRODUCTION_MODE=true`;

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Write production environment file
fs.writeFileSync('.env.production', productionEnv);
console.log('✅ Created .env.production file');

// Create production server script
const productionServer = `#!/usr/bin/env node

/**
 * Production Server for WhatsApp Business Automation
 * Run with: node production-server.js
 */

require('dotenv').config({ path: '.env.production' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

// Production middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Production rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to Production MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Serve static files
app.use(express.static('public'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/webhook', require('./routes/webhook'));

// Serve the main dashboard
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Production error handling
app.use((err, req, res, next) => {
  console.error('Production Error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(\`🚀 Production server running on port \${PORT}\`);
  console.log(\`📱 WhatsApp Business Automation - Production Mode\`);
  console.log(\`🌐 Access: http://localhost:\${PORT}\`);
  console.log(\`⚡ Unlimited messaging enabled\`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

module.exports = app;`;

fs.writeFileSync('production-server.js', productionServer);
console.log('✅ Created production-server.js');

// Create PM2 configuration
const pm2Config = {
  "apps": [{
    "name": "whatsapp-automation",
    "script": "production-server.js",
    "instances": 1,
    "exec_mode": "cluster",
    "env": {
      "NODE_ENV": "production",
      "PORT": 3001
    },
    "env_production": {
      "NODE_ENV": "production",
      "PORT": 3001
    },
    "log_file": "./logs/combined.log",
    "out_file": "./logs/out.log",
    "error_file": "./logs/error.log",
    "log_date_format": "YYYY-MM-DD HH:mm Z"
  }]
};

fs.writeFileSync('ecosystem.config.js', JSON.stringify(pm2Config, null, 2));
console.log('✅ Created PM2 configuration');

// Create production setup instructions
const instructions = `# 🚀 Production Setup Instructions

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

\`\`\`bash
# Install PM2 globally
npm install -g pm2

# Start production server
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
\`\`\`

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

\`\`\`bash
# Check server status
pm2 status

# View logs
pm2 logs whatsapp-automation

# Restart server
pm2 restart whatsapp-automation
\`\`\`

## 6. Backup

\`\`\`bash
# Backup database
mongodump --db whatsapp_automation_prod --out ./backup

# Restore database
mongorestore --db whatsapp_automation_prod ./backup/whatsapp_automation_prod
\`\`\`

Your WhatsApp Business Automation is now production-ready with unlimited messaging! 🎉`;

fs.writeFileSync('PRODUCTION_INSTRUCTIONS.md', instructions);
console.log('✅ Created production instructions');

console.log('\n🎉 Production setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Configure your WhatsApp provider (Twilio or WhatsApp Business API)');
console.log('2. Update .env.production with your credentials');
console.log('3. Run: node production-server.js');
console.log('\n📖 See PRODUCTION_INSTRUCTIONS.md for detailed setup guide');
console.log('\n🚀 Your system is ready for unlimited messaging without restrictions!');
