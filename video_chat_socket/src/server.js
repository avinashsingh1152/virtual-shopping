import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import { randomUUID } from 'crypto';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.VIDEO_CHAT_PORT || 3003;

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

// Socket.IO configuration - MUST BE BEFORE connection handlers
const io = new Server(httpServer, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
});

// Initialize Redis client
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379/3';
const redisClient = createClient({
  url: redisUrl,
  keyPrefix: 'hackthon-13:'
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis Client Connected (Database 3, prefix: hackthon-13:)');
});

(async () => {
  try {
    await redisClient.connect();
    if (!redisUrl.includes('/3') && !redisUrl.includes('?db=3')) {
      await redisClient.select(3);
    }
    console.log('Redis connection established on database 3');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    console.warn('Continuing without Redis - room data will not persist');
  }
})();

// Generate unique user ID using UUID v4
function generateUniqueUserId() {
  return `user-${randomUUID()}`;
}

// Store active rooms and users
const rooms = new Map(); // roomId -> { users: Set, metadata: {} }
const users = new Map(); // socketId -> { userId, roomId, name, role, joinedAt }

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Video Chat Socket Server',
    timestamp: new Date().toISOString() 
  });
});

// Leave room helper
async function leaveRoom(socket, roomId) {
  const room = rooms.get(roomId);
  if (room) {
    room.users.delete(socket.id);
    const user = users.get(socket.id);
    if (user) {
      socket.to(roomId).emit('user-left', { 
        userId: user.userId, 
        socketId: socket.id 
      });
    }
    if (room.users.size === 0) {
      rooms.delete(roomId);
      console.log(`Room ${roomId} deleted (empty)`);
      try {
        if (redisClient && redisClient.isOpen) {
          const key = `room:${roomId}`;
          const deletedCount = await redisClient.del(key);
          if (deletedCount > 0) {
            console.log(`✅ Room ${roomId} deleted from Redis`);
          }
        }
      } catch (redisError) {
        console.error('❌ Error deleting room from Redis:', redisError);
      }
    }
  }
  socket.leave(roomId);
  console.log(`User left room: ${roomId}`);
}

// Socket.IO connection handling - VIDEO CHAT ONLY
io.on('connection', (socket) => {
  console.log(`🎥 Video chat client connected: ${socket.id}`);

  // Join a room
  socket.on('join-room', async ({ roomId, userId, userName, productCategory }) => {
    try {
      if (!roomId || !userName) {
        socket.emit('error', { message: 'Missing required fields: roomId, userName' });
        return;
      }

      // Generate unique user ID on backend
      const uniqueUserId = generateUniqueUserId();
      console.log(`🔑 Generated unique user ID: ${uniqueUserId} for socket ${socket.id}`);

      // Leave previous room if any
      const previousUser = users.get(socket.id);
      if (previousUser && previousUser.roomId) {
        await leaveRoom(socket, previousUser.roomId);
      }

      // Check if room exists
      const roomExistsInMemory = rooms.has(roomId);
      let roomExistsInRedis = false;
      
      if (!roomExistsInMemory) {
        try {
          const redisKey = `room:${roomId}`;
          const roomDataStr = await redisClient.get(redisKey);
          roomExistsInRedis = !!roomDataStr;
        } catch (redisError) {
          console.error('Error checking Redis for room:', redisError);
        }
      }

      const isNewRoom = !roomExistsInMemory && !roomExistsInRedis;

      if (isNewRoom) {
        if (!productCategory) {
          socket.emit('error', { message: 'Product category is required when creating a new room' });
          return;
        }

        const ownerInfo = {
          userId: uniqueUserId,
          userName: userName,
          socketId: socket.id
        };

        rooms.set(roomId, {
          users: new Set(),
          metadata: { 
            createdAt: new Date().toISOString(),
            productCategory: productCategory,
            owner: ownerInfo
          }
        });

        // Store in Redis
        try {
          const roomData = {
            roomId: roomId,
            productCategory: productCategory,
            owner: {
              userId: uniqueUserId,
              userName: userName
            },
            createdAt: new Date().toISOString()
          };
          await redisClient.setEx(`room:${roomId}`, 86400, JSON.stringify(roomData));
          console.log(`✅ Room ${roomId} created and saved to Redis`);
        } catch (redisError) {
          console.error('❌ Error saving room to Redis:', redisError);
        }
      } else {
        if (!roomExistsInMemory) {
          let ownerFromRedis = null;
          try {
            const redisKey = `room:${roomId}`;
            const roomDataStr = await redisClient.get(redisKey);
            if (roomDataStr) {
              const roomData = JSON.parse(roomDataStr);
              ownerFromRedis = roomData.owner || null;
            }
          } catch (error) {
            console.error('Error loading owner from Redis:', error);
          }

          rooms.set(roomId, {
            users: new Set(),
            metadata: { 
              createdAt: new Date().toISOString(),
              productCategory: null,
              owner: ownerFromRedis
            }
          });
        }
      }

      const room = rooms.get(roomId);
      room.users.add(socket.id);

      const isOwner = room.metadata.owner && room.metadata.owner.userId === uniqueUserId;

      users.set(socket.id, {
        userId: uniqueUserId,
        roomId,
        name: userName,
        socketId: socket.id,
        role: isOwner ? 'owner' : 'participant',
        joinedAt: new Date().toISOString()
      });

      socket.join(roomId);

      socket.emit('joined-room', {
        roomId,
        userId: uniqueUserId,
        userName,
        role: isOwner ? 'owner' : 'participant',
        owner: room.metadata.owner ? {
          userId: room.metadata.owner.userId,
          userName: room.metadata.owner.userName
        } : null
      });

      const existingUsers = Array.from(room.users)
        .map(sid => {
          const user = users.get(sid);
          return user && sid !== socket.id ? {
            userId: user.userId,
            userName: user.name,
            socketId: user.socketId,
            role: user.role || 'participant'
          } : null;
        })
        .filter(Boolean);

      socket.emit('room-users', { 
        users: existingUsers,
        owner: room.metadata.owner ? {
          userId: room.metadata.owner.userId,
          userName: room.metadata.owner.userName
        } : null
      });

      socket.to(roomId).emit('user-joined', {
        userId: uniqueUserId,
        userName,
        socketId: socket.id,
        role: isOwner ? 'owner' : 'participant'
      });

      console.log(`✅ User ${uniqueUserId} (${userName}) joined room ${roomId}`);
    } catch (error) {
      console.error('Error in join-room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Leave room
  socket.on('leave-room', async () => {
    const user = users.get(socket.id);
    if (user && user.roomId) {
      await leaveRoom(socket, user.roomId);
    }
  });

  // WebRTC signaling: offer
  socket.on('offer', ({ offer, targetSocketId, roomId }) => {
    try {
      const user = users.get(socket.id);
      if (!user || user.roomId !== roomId) {
        socket.emit('error', { message: 'Not in room' });
        return;
      }

      socket.to(targetSocketId).emit('offer', {
        offer,
        senderSocketId: socket.id,
        senderUserId: user.userId,
        senderUserName: user.name
      });
    } catch (error) {
      console.error('Error in offer:', error);
      socket.emit('error', { message: 'Failed to send offer' });
    }
  });

  // WebRTC signaling: answer
  socket.on('answer', ({ answer, targetSocketId, roomId }) => {
    try {
      const user = users.get(socket.id);
      if (!user || user.roomId !== roomId) {
        socket.emit('error', { message: 'Not in room' });
        return;
      }

      socket.to(targetSocketId).emit('answer', {
        answer,
        senderSocketId: socket.id,
        senderUserId: user.userId,
        senderUserName: user.name
      });
    } catch (error) {
      console.error('Error in answer:', error);
      socket.emit('error', { message: 'Failed to send answer' });
    }
  });

  // WebRTC signaling: ICE candidate
  socket.on('ice-candidate', ({ candidate, targetSocketId, roomId }) => {
    try {
      const user = users.get(socket.id);
      if (!user || user.roomId !== roomId) {
        return;
      }

      socket.to(targetSocketId).emit('ice-candidate', {
        candidate,
        senderSocketId: socket.id
      });
    } catch (error) {
      console.error('Error in ice-candidate:', error);
    }
  });

  // Toggle audio
  socket.on('toggle-audio', ({ isMuted, roomId }) => {
    try {
      const user = users.get(socket.id);
      if (!user || user.roomId !== roomId) {
        return;
      }

      socket.to(roomId).emit('user-audio-changed', {
        userId: user.userId,
        socketId: socket.id,
        isMuted
      });
    } catch (error) {
      console.error('Error in toggle-audio:', error);
    }
  });

  // Toggle video
  socket.on('toggle-video', ({ isVideoOff, roomId }) => {
    try {
      const user = users.get(socket.id);
      if (!user || user.roomId !== roomId) {
        return;
      }

      socket.to(roomId).emit('user-video-changed', {
        userId: user.userId,
        socketId: socket.id,
        isVideoOff
      });
    } catch (error) {
      console.error('Error in toggle-video:', error);
    }
  });

  // Chat message
  socket.on('chat-message', ({ roomId, message, userName }) => {
    try {
      const user = users.get(socket.id);
      if (!user || user.roomId !== roomId) {
        return;
      }

      socket.to(roomId).emit('chat-message', {
        userId: user.userId,
        userName: userName || user.name,
        message: message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in chat-message:', error);
    }
  });

  socket.on('disconnect', async () => {
    const user = users.get(socket.id);
    if (user && user.roomId) {
      await leaveRoom(socket, user.roomId);
    }
    users.delete(socket.id);
    console.log(`🎥 Video chat client disconnected: ${socket.id}`);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🎥 Video Chat Socket Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.IO endpoint: ws://localhost:${PORT}`);
});
