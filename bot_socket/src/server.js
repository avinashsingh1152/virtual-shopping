import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { getBotResponse, clearConversationHistory } from './botService.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.BOT_SOCKET_PORT || 3002;

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.match(/^https?:\/\/localhost(:\d+)?$/) || 
        origin.match(/^https?:\/\/127\.0\.0\.1(:\d+)?$/)) {
      return callback(null, true);
    }
    const allowedOrigin = process.env.CLIENT_ORIGIN;
    if (allowedOrigin && (allowedOrigin === '*' || origin === allowedOrigin)) {
      return callback(null, true);
    }
    if (!allowedOrigin) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));

// Socket.IO configuration
const io = new Server(httpServer, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Bot Socket Server',
    timestamp: new Date().toISOString() 
  });
});

// Bot configuration endpoint
app.get('/api/bot/config', (req, res) => {
  res.json({
    genvoyBaseUrl: process.env.GENVOY_BASE_URL || 'http://genvoy.jarvis-prod.fkcloud.in',
    modelName: process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash',
    enabled: true
  });
});

// Socket.IO connection handling - BOT ONLY
io.on('connection', (socket) => {
  console.log(`🤖 Bot client connected: ${socket.id}`);

  // Speak to bot
  socket.on('speak-to-bot', async (data) => {
    try {
      const { message, roomId, userId, userName } = data;

      if (!message || !roomId) {
        socket.emit('bot-error', { 
          message: 'Missing required fields: message, roomId' 
        });
        return;
      }

      console.log(`💬 Bot message from ${userName} (${userId}) in room ${roomId}: ${message}`);

      // Get bot response
      const botResponse = await getBotResponse(roomId, message, userId, userName);

      // Send response back to client
      socket.emit('bot-response', {
        roomId: roomId,
        message: botResponse,
        timestamp: new Date().toISOString()
      });

      // Also broadcast to room (optional - for multi-user bot interactions)
      socket.to(roomId).emit('bot-message', {
        roomId: roomId,
        userId: userId,
        userName: userName,
        userMessage: message,
        botResponse: botResponse,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in speak-to-bot:', error);
      socket.emit('bot-error', { 
        message: 'Failed to get bot response',
        error: error.message 
      });
    }
  });

  // Clear bot conversation history
  socket.on('clear-bot-history', (data) => {
    try {
      const { roomId } = data;

      if (!roomId) {
        socket.emit('bot-error', { 
          message: 'Missing required field: roomId' 
        });
        return;
      }

      clearConversationHistory(roomId);
      console.log(`🗑️  Bot history cleared for room ${roomId}`);

      socket.emit('bot-history-cleared', {
        roomId: roomId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error clearing bot history:', error);
      socket.emit('bot-error', { 
        message: 'Failed to clear bot history',
        error: error.message 
      });
    }
  });

  // Join bot room (for room-specific bot interactions)
  socket.on('join-bot-room', (data) => {
    try {
      const { roomId } = data;
      if (roomId) {
        socket.join(roomId);
        console.log(`🤖 Bot client ${socket.id} joined room ${roomId}`);
        socket.emit('joined-bot-room', { roomId });
      }
    } catch (error) {
      console.error('Error joining bot room:', error);
    }
  });

  // Leave bot room
  socket.on('leave-bot-room', (data) => {
    try {
      const { roomId } = data;
      if (roomId) {
        socket.leave(roomId);
        console.log(`🤖 Bot client ${socket.id} left room ${roomId}`);
      }
    } catch (error) {
      console.error('Error leaving bot room:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🤖 Bot client disconnected: ${socket.id}`);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🤖 Bot Socket Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.IO endpoint: ws://localhost:${PORT}`);
});
