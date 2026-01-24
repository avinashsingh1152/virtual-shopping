import express from 'express';
import { connectRedis } from '../config/redis.js';

const router = express.Router();

/**
 * GET /api/redis/rooms
 * Get all rooms with their product categories
 */
router.get('/rooms', async (req, res) => {
  try {
    const redisClient = await connectRedis();
    
    // Get all keys matching the pattern
    const keys = await redisClient.keys('room:*');
    
    if (keys.length === 0) {
      return res.json({
        success: true,
        message: 'No rooms found',
        rooms: [],
        count: 0
      });
    }

    // Fetch all room data
    const rooms = [];
    for (const key of keys) {
      try {
        const value = await redisClient.get(key);
        if (value) {
          const roomData = JSON.parse(value);
          rooms.push({
            roomId: roomData.roomId,
            productCategory: roomData.productCategory,
            createdAt: roomData.createdAt
          });
        }
      } catch (error) {
        console.error(`Error parsing room data for key ${key}:`, error);
      }
    }

    res.json({
      success: true,
      rooms: rooms,
      count: rooms.length
    });
  } catch (error) {
    console.error('Redis rooms error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve rooms from Redis',
      details: error.message
    });
  }
});

/**
 * GET /api/redis/room/:roomId
 * Get specific room by roomId
 */
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const redisClient = await connectRedis();
    
    const key = `room:${roomId}`;
    const value = await redisClient.get(key);

    if (!value) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Room ${roomId} not found in Redis`
      });
    }

    const roomData = JSON.parse(value);

    res.json({
      success: true,
      room: {
        roomId: roomData.roomId,
        productCategory: roomData.productCategory,
        createdAt: roomData.createdAt
      }
    });
  } catch (error) {
    console.error('Redis room error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve room from Redis',
      details: error.message
    });
  }
});

/**
 * GET /api/redis/rooms/category/:category
 * Get all rooms by product category
 */
router.get('/rooms/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const redisClient = await connectRedis();
    
    // Get all room keys
    const keys = await redisClient.keys('room:*');
    
    const rooms = [];
    for (const key of keys) {
      try {
        const value = await redisClient.get(key);
        if (value) {
          const roomData = JSON.parse(value);
          // Case-insensitive category matching
          if (roomData.productCategory && 
              roomData.productCategory.toLowerCase() === category.toLowerCase()) {
            rooms.push({
              roomId: roomData.roomId,
              productCategory: roomData.productCategory,
              createdAt: roomData.createdAt
            });
          }
        }
      } catch (error) {
        console.error(`Error parsing room data for key ${key}:`, error);
      }
    }

    res.json({
      success: true,
      category: category,
      rooms: rooms,
      count: rooms.length
    });
  } catch (error) {
    console.error('Redis category error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve rooms by category',
      details: error.message
    });
  }
});

/**
 * POST /api/redis/room
 * Create/Update a room in Redis (for testing)
 */
router.post('/room', async (req, res) => {
  try {
    const { roomId, productCategory } = req.body;

    if (!roomId || !productCategory) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'roomId and productCategory are required'
      });
    }

    const redisClient = await connectRedis();
    
    const roomData = {
      roomId: roomId,
      productCategory: productCategory,
      createdAt: new Date().toISOString()
    };

    const key = `room:${roomId}`;
    await redisClient.set(key, JSON.stringify(roomData));

    res.status(201).json({
      success: true,
      message: 'Room created/updated in Redis',
      room: roomData
    });
  } catch (error) {
    console.error('Redis create room error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create/update room in Redis',
      details: error.message
    });
  }
});

/**
 * DELETE /api/redis/room/:roomId
 * Delete a room from Redis
 */
router.delete('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const redisClient = await connectRedis();
    
    const key = `room:${roomId}`;
    const deleted = await redisClient.del(key);

    if (deleted === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Room ${roomId} not found in Redis`
      });
    }

    res.json({
      success: true,
      message: `Room ${roomId} deleted from Redis`
    });
  } catch (error) {
    console.error('Redis delete room error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete room from Redis',
      details: error.message
    });
  }
});

/**
 * DELETE /api/redis/clear
 * Delete all room data from Redis (for testing/cleanup)
 */
router.delete('/clear', async (req, res) => {
  try {
    const redisClient = await connectRedis();
    
    // Get all keys matching the pattern
    const keys = await redisClient.keys('room:*');
    
    if (keys.length === 0) {
      return res.json({
        success: true,
        message: 'No data to delete. Redis is already empty.',
        deletedCount: 0
      });
    }

    // Delete all keys
    const deletedCount = await redisClient.del(keys);

    res.json({
      success: true,
      message: `Deleted ${deletedCount} room(s) from Redis`,
      deletedCount: deletedCount
    });
  } catch (error) {
    console.error('Redis clear error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to clear Redis data',
      details: error.message
    });
  }
});

/**
 * GET /api/redis/categories
 * Get all unique product categories
 */
router.get('/categories', async (req, res) => {
  try {
    const redisClient = await connectRedis();
    
    const keys = await redisClient.keys('room:*');
    const categories = new Set();

    for (const key of keys) {
      try {
        const value = await redisClient.get(key);
        if (value) {
          const roomData = JSON.parse(value);
          if (roomData.productCategory) {
            categories.add(roomData.productCategory);
          }
        }
      } catch (error) {
        console.error(`Error parsing room data for key ${key}:`, error);
      }
    }

    res.json({
      success: true,
      categories: Array.from(categories).sort(),
      count: categories.size
    });
  } catch (error) {
    console.error('Redis categories error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve categories',
      details: error.message
    });
  }
});

export { router as redisRouter };
