#!/usr/bin/env node

// Simple startup script to ensure the server starts properly
console.log('🚀 Starting WhatsApp Business Automation Server...');
console.log('📅 Time:', new Date().toISOString());
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
console.log('🔧 Node Version:', process.version);

// Check required environment variables
const requiredEnvVars = ['MONGODB_URI'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn('⚠️ Missing environment variables:', missingVars);
  console.warn('⚠️ Using default values for development');
}

// Start the server
try {
  require('./server.js');
  console.log('✅ Server startup initiated successfully');
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}
