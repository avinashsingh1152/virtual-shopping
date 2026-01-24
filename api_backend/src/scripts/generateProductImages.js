import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Genvoy API Configuration for Nano Banana (Image Generation)
const GENVOY_BASE_URL = process.env.GENVOY_BASE_URL || 'https://genvoy.flipkart.net';
const IMAGE_MODEL_NAME = process.env.GEMINI_IMAGE_MODEL_NAME || 'gemini-2.5-flash-image';
const IMAGE_SUBSCRIPTION_KEY = process.env.GEMINI_IMAGE_SUBSCRIPTION_KEY || '751d07a2ee51425385d1b8523166e90b';

// Image storage directory
const IMAGES_DIR = path.join(__dirname, '../../public/product-images');

// Product categories to generate images for
const PRODUCT_CATEGORIES = [
  'Electronics',
  'Clothing',
  'Home & Kitchen',
  'Sports',
  'Books',
  'Toys',
  'Beauty',
  'Automotive',
  'Furniture',
  'Gaming'
];

// Track generated images to avoid duplicates
const generatedImages = new Set();

/**
 * Ensure images directory exists
 */
async function ensureDirectoryExists() {
  try {
    await fs.mkdir(IMAGES_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating images directory:', error);
  }
}

/**
 * Generate 3D product image using Nano Banana
 * @param {string} category - Product category
 * @returns {Promise<string|null>} - Path to saved image or null if failed
 */
async function generate3DProductImage(category) {
  try {
    // Create a safe filename
    const safeCategory = category.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const timestamp = Date.now();
    const filename = `${safeCategory}_3d_${timestamp}.png`;
    const filepath = path.join(IMAGES_DIR, filename);

    // Check if we've already generated this category recently
    const imageKey = `${category}_${Math.floor(timestamp / 60000)}`; // Group by minute
    if (generatedImages.has(imageKey)) {
      console.log(`⏭️  Skipping ${category} - already generated this minute`);
      return null;
    }

    console.log(`🎨 Generating 3D product image for: ${category}`);

    // Prepare request payload for 3D product image without background
    const requestPayload = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Generate a high-quality 3D product image for Flipkart e-commerce: ${category} product. The image should be a 3D rendered product with no background (transparent or white background), professional lighting, clean presentation, suitable for product listing. Show the product from a good angle with realistic 3D rendering.`
            }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.4,
        topP: 0.4,
        topK: 32,
        thinkingConfig: {
          thinkingBudget: 0
        }
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    };

    // Make API call to Genvoy for image generation
    const endpoint = `${GENVOY_BASE_URL}/${IMAGE_MODEL_NAME}/:generateContent`;
    
    console.log(`📡 Calling Genvoy API: ${endpoint}`);
    
    const response = await axios.post(endpoint, requestPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': IMAGE_SUBSCRIPTION_KEY
      },
      timeout: 120000 // 2 minutes timeout for image generation
    });

    console.log(`✅ API Response received for ${category}`);

    // Extract image data from response
    if (response.data && response.data.candidates && response.data.candidates.length > 0) {
      const candidate = response.data.candidates[0];
      
      // Check for inline data (base64 image)
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inline_data && part.inline_data.data) {
            // Decode base64 image
            const imageBuffer = Buffer.from(part.inline_data.data, 'base64');
            
            // Save image to file
            await fs.writeFile(filepath, imageBuffer);
            
            const relativePath = `/product-images/${filename}`;
            generatedImages.add(imageKey);
            
            console.log(`✅ Successfully generated and saved: ${filename}`);
            console.log(`📁 Path: ${relativePath}`);
            
            return relativePath;
          }
        }
      }
      
      // Check if response contains image URL
      if (response.data.imageUrl) {
        console.log(`📥 Downloading image from URL: ${response.data.imageUrl}`);
        const imageResponse = await axios.get(response.data.imageUrl, {
          responseType: 'arraybuffer'
        });
        await fs.writeFile(filepath, Buffer.from(imageResponse.data));
        
        const relativePath = `/product-images/${filename}`;
        generatedImages.add(imageKey);
        
        console.log(`✅ Successfully downloaded and saved: ${filename}`);
        return relativePath;
      }
    }

    throw new Error('No image data in response');
  } catch (error) {
    console.error(`❌ Error generating image for ${category}:`, error.message);
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data).substring(0, 200));
    } else if (error.request) {
      console.error('   No response from API');
    }
    
    return null;
  }
}

/**
 * Generate images for random categories
 */
async function generateRandomProductImages() {
  try {
    // Pick a random category
    const randomCategory = PRODUCT_CATEGORIES[Math.floor(Math.random() * PRODUCT_CATEGORIES.length)];
    
    console.log(`\n🔄 Starting image generation cycle at ${new Date().toISOString()}`);
    console.log(`📦 Selected category: ${randomCategory}`);
    
    const imagePath = await generate3DProductImage(randomCategory);
    
    if (imagePath) {
      console.log(`✨ Cycle completed successfully`);
    } else {
      console.log(`⚠️  Cycle completed but no image was generated`);
    }
    
    // Clean up old tracking entries (keep last 60 minutes)
    const currentMinute = Math.floor(Date.now() / 60000);
    for (const key of generatedImages) {
      const keyMinute = parseInt(key.split('_').pop());
      if (currentMinute - keyMinute > 60) {
        generatedImages.delete(key);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in generation cycle:', error);
  }
}

/**
 * Main function - runs every minute
 */
async function main() {
  console.log('🚀 Product Image Generator Script Started');
  console.log(`📂 Images will be saved to: ${IMAGES_DIR}`);
  console.log(`⏰ Running every 60 seconds...`);
  console.log(`🎯 Categories: ${PRODUCT_CATEGORIES.join(', ')}`);
  console.log('─'.repeat(60));
  
  // Ensure directory exists
  await ensureDirectoryExists();
  
  // Run immediately on start
  await generateRandomProductImages();
  
  // Then run every minute
  setInterval(async () => {
    await generateRandomProductImages();
  }, 60000); // 60000ms = 1 minute
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down gracefully...');
    process.exit(0);
  });
}

// Run the script
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
