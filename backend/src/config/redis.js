import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Redis URL from environment or default
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/3';

// Create Redis client
const redisClient = createClient({
  url: REDIS_URL,
  // If the URL already contains database, we don't strictly need this, but good to be explicit if separated
  // database: 3, 
  keyPrefix: 'hackthon-13:'
});

// Error handling
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis Client Connected');
});

redisClient.on('ready', () => {
  console.log('✅ Redis Client Ready');
});

redisClient.on('end', () => {
  console.log('❌ Redis Client Disconnected');
});

// Connect to Redis
let isConnected = false;

export async function connectRedis() {
  if (!isConnected) {
    try {
      await redisClient.connect();
      // Ensure we are on the right database if not specified in URL
      if (!REDIS_URL.includes('/3') && !REDIS_URL.includes('?db=3')) {
        await redisClient.select(3);
      }
      isConnected = true;
      console.log(`✅ Connected to Redis on ${REDIS_URL}`);
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      // Don't throw, allows app to start without Redis (with limited functionality)
    }
  }
  return redisClient;
}

export { redisClient };
