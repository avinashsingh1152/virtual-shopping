import './loadEnv.js';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Domain Routes
import productRoutes from './domain/product/productRoutes.js';
import chatRoutes from './domain/chat/chatRoutes.js';
import videoRoutes from './domain/video/videoRoutes.js';
import aiRoutes from './domain/ai/aiRoutes.js'; // Legacy adapter

// Socket
import { initializeSocket } from './socket.js';
import { productService } from './domain/product/productService.js';

// Configuration
// import './config/redis.js'; // Ensure Redis connects

// dotenv loaded by loadEnv.js

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// CRITICAL: PORT must be provided by environment (Render provides this automatically)
if (!process.env.PORT) {
    console.error('❌ FATAL ERROR: PORT environment variable is not set!');
    console.error('   Render should provide this automatically.');
    console.error('   For local development, set PORT=3001 in your .env file');
    process.exit(1);
}

const PORT = parseInt(process.env.PORT, 10);

if (isNaN(PORT) || PORT <= 0) {
    console.error(`❌ FATAL ERROR: Invalid PORT value: ${process.env.PORT}`);
    console.error('   PORT must be a valid positive number');
    process.exit(1);
}

// Debug: Log environment
console.log('🔧 Environment Debug:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  PORT:', PORT);

// CORS setup
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        // Allow localhost (development)
        if (origin.match(/^https?:\/\/localhost(:\d+)?$/) ||
            origin.match(/^https?:\/\/127\.0\.0\.1(:\d+)?$/) ||
            origin.match(/^https?:\/\/\[::1\](:\d+)?$/)) {
            return callback(null, true);
        }

        // Check CLIENT_ORIGIN
        const allowedOrigin = process.env.CLIENT_ORIGIN;
        if (allowedOrigin && (allowedOrigin === '*' || origin === allowedOrigin)) {
            return callback(null, true);
        }

        return callback(null, true); // Strict mode: callback(new Error('Not allowed by CORS')); -> Relaxed for hackathon
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Static Files
// Serve public directory from root of backend
// backend/src/server.js -> backend/public
const publicDir = path.join(__dirname, '..', 'public');
app.use('/public', express.static(publicDir));
app.use(express.static(publicDir)); // Also serve at root if needed

console.log('Serving static files from:', publicDir);

// Initialize Socket.IO
initializeSocket(httpServer);

// Routes
app.use('/api/products', productRoutes);
app.use('/api/bot', chatRoutes); // New standard for chat
app.use('/api', videoRoutes);    // Mounts /rooms and /redis/rooms
app.use('/api/ai', aiRoutes);    // Legacy adapter

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Virtual Shopping Unified Backend',
        timestamp: new Date().toISOString()
    });
});

// Root
app.get('/', (req, res) => {
    res.json({
        message: 'Virtual Shopping Backend',
        endpoints: {
            health: '/health',
            products: '/api/products',
            chat: '/api/bot/chat',
            ai: '/api/ai/chat'
        }
    });
});

// 404
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.path });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start
(async () => {
    try {
        await productService.initializeProducts();
    } catch (err) {
        console.error('Failed to initialize products:', err);
    }

    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 Server running on port ${PORT}`);
        console.log(`📡 Health Check: http://localhost:${PORT}/health`);
        console.log(`🛍️  Products:     http://localhost:${PORT}/api/products`);
        console.log(`🤖 Bot Chat:     http://localhost:${PORT}/api/bot/chat`);
        console.log(`🔌 Socket.IO:    ws://localhost:${PORT}\n`);
    });
})();
