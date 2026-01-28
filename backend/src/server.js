const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Initialize database
const { initializeDatabase, testConnection } = require('./config/database');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const pickupRoutes = require('./routes/pickups');
const walletRoutes = require('./routes/wallets');
const adminRoutes = require('./routes/admin');
const residentRoutes = require('./routes/residents');
const collectionRoutes = require('./routes/collections');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const server = createServer(app);

// Socket.IO for real-time updates
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    methods: ["GET", "POST"]
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
  credentials: true
}));
app.use(limiter);
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'WozaMali Unified Backend',
      database: dbConnected ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'WozaMali Unified Backend',
      database: 'error',
      error: error.message
    });
  }
});

// Database status endpoint
app.get('/db-status', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({ 
      connected: dbConnected,
      message: dbConnected ? 'Database is connected' : 'Database is not connected'
    });
  } catch (error) {
    res.json({ 
      connected: false,
      message: 'Database connection error',
      error: error.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/pickups', authenticateToken, pickupRoutes);
app.use('/api/wallets', authenticateToken, walletRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/residents', authenticateToken, residentRoutes);
app.use('/api/collections', authenticateToken, collectionRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join role-based rooms
  socket.on('join-room', (data) => {
    const { userId, role } = data;
    socket.join(`user-${userId}`);
    socket.join(`role-${role}`);
    console.log(`User ${userId} joined rooms: user-${userId}, role-${role}`);
  });

  // Handle pickup updates
  socket.on('pickup-updated', (data) => {
    const { pickupId, status, collectorId, customerId } = data;
    
    // Notify relevant users
    if (collectorId) {
      io.to(`user-${collectorId}`).emit('pickup-status-changed', data);
    }
    if (customerId) {
      io.to(`user-${customerId}`).emit('pickup-status-changed', data);
    }
    
    // Notify admins
    io.to('role-admin').emit('pickup-updated', data);
  });

  // Handle wallet updates
  socket.on('wallet-updated', (data) => {
    const { userId, newBalance } = data;
    io.to(`user-${userId}`).emit('wallet-balance-changed', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
 });

const PORT = process.env.PORT || 5000;

// Start server with database initialization
const startServer = async () => {
  try {
    // Initialize database
    console.log('🔌 Initializing database connection...');
    const dbInitialized = initializeDatabase();
    
    if (dbInitialized) {
      // Test database connection
      const dbConnected = await testConnection();
      if (dbConnected) {
        console.log('✅ Database connection successful');
      } else {
        console.log('⚠️  Database connection failed - some features may not work');
        console.log('💡 To fix this, install PostgreSQL and update your .env file');
      }
    } else {
      console.log('⚠️  Database initialization failed - some features may not work');
    }
    
    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 WozaMali Unified Backend running on port ${PORT}`);
      console.log(`📱 Ready to serve Main App, Collector App, and Office App`);
      console.log(`🔌 Socket.IO enabled for real-time updates`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`🔍 Database status: http://localhost:${PORT}/db-status`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = { app, io };
