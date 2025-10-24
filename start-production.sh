#!/bin/bash

echo "🚀 Starting WhatsApp Business Automation - Production Mode"
echo "========================================================="

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production not found. Running setup first..."
    node setup-production.js
fi

# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Create logs directory
mkdir -p logs

# Start production server
echo "🚀 Starting production server..."
pm2 start production-server.js --name whatsapp-automation

# Save PM2 configuration
pm2 save

echo ""
echo "✅ Production server started!"
echo "🌐 Access your application at: http://localhost:3001"
echo "📊 Monitor with: pm2 status"
echo "📝 View logs with: pm2 logs whatsapp-automation"
echo ""
echo "🎯 Your WhatsApp automation is now running in production mode!"
echo "📱 Unlimited messaging without restrictions!"
echo ""
echo "📋 To configure WhatsApp:"
echo "1. Edit .env.production file"
echo "2. Add your Twilio or WhatsApp Business API credentials"
echo "3. Restart: pm2 restart whatsapp-automation"
