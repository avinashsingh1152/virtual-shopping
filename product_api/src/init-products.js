// Script to initialize or reset products in Redis
import { createClient } from 'redis';
import dotenv from 'dotenv';
import { sampleProducts } from './products.js';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379/3';
const redisClient = createClient({
  url: redisUrl,
  keyPrefix: 'hackthon-13:'
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

async function initializeProducts() {
  try {
    await redisClient.connect();
    if (!redisUrl.includes('/3') && !redisUrl.includes('?db=3')) {
      await redisClient.select(3);
    }
    console.log('✅ Connected to Redis');

    // Delete existing products
    const existingKeys = await redisClient.keys('product:*');
    if (existingKeys.length > 0) {
      console.log(`🗑️  Deleting ${existingKeys.length} existing products...`);
      for (const key of existingKeys) {
        await redisClient.del(key);
      }
    }

    // Store all products
    console.log(`📦 Storing ${sampleProducts.length} products...`);
    for (const product of sampleProducts) {
      await redisClient.set(`product:${product.id}`, JSON.stringify(product));
    }

    console.log(`✅ Successfully initialized ${sampleProducts.length} products in Redis`);
    console.log(`\n📊 Product breakdown:`);
    const categoryCounts = {};
    sampleProducts.forEach(p => {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    });
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} products`);
    });

    await redisClient.quit();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing products:', error);
    await redisClient.quit();
    process.exit(1);
  }
}

initializeProducts();
