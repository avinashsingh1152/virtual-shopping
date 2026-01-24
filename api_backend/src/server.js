import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { aiAgentRouter } from './routes/aiAgent.js';
import { databaseRouter } from './routes/database.js';
import { redisRouter } from './routes/redis.js';
import { productImagesRouter } from './routes/productImages.js';
import { connectRedis } from './config/redis.js';
import { loadExistingImages } from './services/productImageService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - Allow all localhost ports and configured origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow all localhost ports
    if (origin.match(/^https?:\/\/localhost(:\d+)?$/) || 
        origin.match(/^https?:\/\/127\.0\.0\.1(:\d+)?$/) ||
        origin.match(/^https?:\/\/\[::1\](:\d+)?$/)) {
      return callback(null, true);
    }
    
    // Allow configured CLIENT_ORIGIN if set
    const allowedOrigin = process.env.CLIENT_ORIGIN;
    if (allowedOrigin && (allowedOrigin === '*' || origin === allowedOrigin)) {
      return callback(null, true);
    }
    
    // Default: allow all origins (for development)
    if (!allowedOrigin) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'API Backend'
  });
});

// Serve static files from public directory (for product images)
app.use(express.static('public'));

// API Routes
app.use('/api/ai', aiAgentRouter);
app.use('/api/db', databaseRouter);
app.use('/api/redis', redisRouter);
app.use('/api/products', productImagesRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'API Backend - Prototype',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      aiAgent: '/api/ai',
      database: '/api/db',
      redis: '/api/redis',
      productImages: '/api/products'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize Redis connection
connectRedis().catch(err => {
  console.warn('⚠️  Redis connection failed (will retry on first request):', err.message);
});

// Load existing product images on startup
loadExistingImages().catch(err => {
  console.warn('⚠️  Could not load existing product images:', err.message);
});

app.listen(PORT, () => {
  console.log(`🚀 API Backend server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 AI Agent API: http://localhost:${PORT}/api/ai`);
  console.log(`💾 Database API: http://localhost:${PORT}/api/db`);
  console.log(`🔴 Redis API: http://localhost:${PORT}/api/redis`);
  console.log(`🖼️  Product Images API: http://localhost:${PORT}/api/products`);
  console.log(`   Test endpoint: http://localhost:${PORT}/api/products/test`);
});
