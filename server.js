const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = createServer(app);

// Configure Socket.io with better CORS settings
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: false
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: "*",
  credentials: false,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting - more lenient for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for production
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Database connection with retry logic
const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp_automation';
      
      console.log(`🔄 Attempting to connect to MongoDB (attempt ${retries + 1}/${maxRetries})...`);
      console.log(`🔗 MongoDB URI: ${mongoURI.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in logs
      
      // Validate MongoDB URI format
      if (!mongoURI.startsWith('mongodb://') && !mongoURI.startsWith('mongodb+srv://')) {
        throw new Error('Invalid MongoDB URI format. Must start with mongodb:// or mongodb+srv://');
      }
      
      await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        bufferCommands: true
      });
      
      console.log('✅ Connected to MongoDB successfully');
      return;
    } catch (error) {
      retries++;
      console.error(`❌ MongoDB connection attempt ${retries} failed:`, error.message);
      
      if (retries < maxRetries) {
        console.log(`⏳ Retrying in 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.error('❌ Failed to connect to MongoDB after all retries');
        console.error('💡 Make sure MONGODB_URI environment variable is set correctly');
        console.error('💡 For Render deployment, check your environment variables in the dashboard');
        // Don't exit in production, let the app continue
        if (process.env.NODE_ENV === 'development') {
          process.exit(1);
        }
      }
    }
  }
};

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected from MongoDB');
});

// Initialize database connection
connectDB();

// Serve static files
app.use(express.static('public'));

// Health check endpoint - this is crucial for Render
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  
  console.log('🏥 Health check requested:', healthCheck);
  res.status(200).json(healthCheck);
});

// Debug endpoint to check loaded routes
app.get('/debug/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods),
        type: 'direct'
      });
    } else if (middleware.name === 'router' && middleware.regexp) {
      const basePath = middleware.regexp.toString()
        .replace('/^\\', '')
        .replace('\\/?(?=\\/|$)/i', '')
        .replace(/\\\//g, '/');
      
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          routes.push({
            mountPath: basePath,
            path: handler.route.path,
            fullPath: basePath + handler.route.path,
            methods: Object.keys(handler.route.methods),
            type: 'router'
          });
        }
      });
    }
  });
  res.json({ routes, totalRoutes: routes.length });
});

// Root endpoint - redirect to login
app.get('/', (req, res) => {
  console.log('🏠 Root endpoint accessed - redirecting to login');
  res.redirect('/login.html');
});

// API Routes with better error handling
const routes = [
  { path: '/api/auth', file: './routes/auth' },
  { path: '/api/clients', file: './routes/clients' },
  { path: '/api/contacts', file: './routes/contacts' },
  { path: '/api/templates', file: './routes/templates' },
  { path: '/api/messages', file: './routes/messages' },
  { path: '/api/appointments', file: './routes/appointments' },
  { path: '/api/billing', file: './routes/billing' },
  { path: '/api/alerts', file: './routes/alerts' },
  { path: '/api/webhook', file: './routes/webhook' },
  { path: '/api/whatsapp', file: './routes/whatsapp' }
];

routes.forEach(route => {
  try {
    app.use(route.path, require(route.file));
    console.log(`✅ Loaded route: ${route.path}`);
  } catch (error) {
    console.error(`❌ Failed to load route ${route.path}:`, error.message);
    console.error(error.stack);
  }
});

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  
  socket.on('join-client', (clientId) => {
    socket.join(`client-${clientId}`);
    console.log(`👤 User ${socket.id} joined client ${clientId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ Route not found:', req.originalUrl);
  res.status(404).json({ message: 'Route not found' });
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('🛑 Graceful shutdown initiated');
  server.close(() => {
    console.log('✅ HTTP server closed');
    mongoose.connection.close()
      .then(() => {
        console.log('✅ MongoDB connection closed');
        process.exit(0);
      })
      .catch((err) => {
        console.error('❌ Error closing MongoDB connection:', err);
        process.exit(1);
      });
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, async () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
  console.log(`🏠 Main app: http://${HOST}:${PORT}/`);
  
  // Connect to database
  await connectDB();
  
  // Start token monitoring in production (disabled for now to prevent timeouts)
  // if (process.env.NODE_ENV === 'production') {
  //   const tokenManager = require('./services/tokenManager');
  //   tokenManager.startMonitoring();
  //   console.log('🔄 Token monitoring started');
  // }
});

// Handle server errors
server.on('error', (err) => {
  console.error('❌ Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  }
});

module.exports = { app, io };