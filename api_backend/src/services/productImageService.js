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

// Ensure images directory exists
(async () => {
  try {
    await fs.mkdir(IMAGES_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating images directory:', error);
  }
})();

// Store product metadata
const productMetadata = new Map(); // category -> { images: [], lastGenerated: timestamp }

/**
 * Generate product image using Nano Banana
 * @param {string} category - Product category
 * @param {string} productDescription - Description of the product to generate
 * @returns {Promise<string>} - Path to saved image
 */
export async function generateProductImage(category, productDescription) {
  try {
    // Create a safe filename
    const safeCategory = category.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const timestamp = Date.now();
    const filename = `${safeCategory}_${timestamp}.png`;
    const filepath = path.join(IMAGES_DIR, filename);

    // Check if image already exists for this category and description
    const existingImage = await findExistingImage(category, productDescription);
    if (existingImage) {
      return existingImage;
    }

    // Prepare request payload for Nano Banana (Image Generation)
    // Based on Nano Banana API contract: uses :generateContent endpoint
    const requestPayload = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Generate a high-quality, professional product image for Flipkart e-commerce: ${productDescription || category}. The image should be clean, well-lit, with a white or neutral background, suitable for product listing. Show the product clearly from a good angle.`
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
    
    const response = await axios.post(endpoint, requestPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': IMAGE_SUBSCRIPTION_KEY
      },
      timeout: 60000 // 60 seconds timeout for image generation
    });

    // Extract image data from response
    // Nano Banana returns images in inline_data format
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
            
            // Store metadata
            const relativePath = `/product-images/${filename}`;
            await storeProductMetadata(category, productDescription, relativePath);
            
            return relativePath;
          }
        }
      }
      
      // Alternative: Check if response contains image URL or other format
      if (response.data.imageUrl) {
        // If API returns URL, download the image
        const imageResponse = await axios.get(response.data.imageUrl, {
          responseType: 'arraybuffer'
        });
        await fs.writeFile(filepath, Buffer.from(imageResponse.data));
        
        const relativePath = `/product-images/${filename}`;
        await storeProductMetadata(category, productDescription, relativePath);
        return relativePath;
      }
    }

    throw new Error('No image data in response. Response: ' + JSON.stringify(response.data).substring(0, 200));
  } catch (error) {
    console.error('Error generating product image:', error);
    
    if (error.response) {
      const errorMsg = error.response.data?.error?.message || 
                      error.response.data?.message || 
                      `HTTP ${error.response.status}`;
      throw new Error(`Image generation failed: ${errorMsg}`);
    } else if (error.request) {
      throw new Error('No response from image generation API');
    } else {
      throw new Error(`Image generation error: ${error.message}`);
    }
  }
}

/**
 * Generate multiple product images for different categories
 * @param {Array<string>} categories - Array of product categories
 * @returns {Promise<Array>} - Array of image paths
 */
export async function generateMultipleProductImages(categories) {
  const results = [];
  
  for (const category of categories) {
    try {
      const imagePath = await generateProductImage(category, `Flipkart ${category} product`);
      results.push({
        category,
        imagePath,
        success: true
      });
    } catch (error) {
      console.error(`Error generating image for category ${category}:`, error);
      results.push({
        category,
        imagePath: null,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Find existing image for category and description
 */
async function findExistingImage(category, description) {
  try {
    const metadata = productMetadata.get(category);
    if (metadata && metadata.images) {
      // Check if we have a similar image
      for (const img of metadata.images) {
        if (img.description && img.description.toLowerCase().includes(description.toLowerCase())) {
          return img.path;
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Store product metadata
 */
async function storeProductMetadata(category, description, imagePath) {
  if (!productMetadata.has(category)) {
    productMetadata.set(category, {
      images: [],
      lastGenerated: Date.now()
    });
  }
  
  const metadata = productMetadata.get(category);
  // Extract filename from path to use as ID
  const filename = imagePath.split('/').pop();
  const imageId = filename.replace(/\.(png|jpg|jpeg)$/i, '');
  
  metadata.images.push({
    id: imageId,
    path: imagePath,
    filename: filename,
    description: description || category,
    generatedAt: new Date().toISOString()
  });
  metadata.lastGenerated = Date.now();
}

/**
 * Get image by ID
 * @param {string} imageId - Image ID (filename without extension)
 * @returns {Object|null} - Image metadata or null if not found
 */
export function getImageById(imageId) {
  for (const [category, metadata] of productMetadata.entries()) {
    if (metadata && metadata.images) {
      const image = metadata.images.find(img => img.id === imageId || img.filename?.replace(/\.(png|jpg|jpeg)$/i, '') === imageId);
      if (image) {
        return {
          ...image,
          category
        };
      }
    }
  }
  return null;
}

/**
 * Get image file path by ID
 * @param {string} imageId - Image ID
 * @returns {string|null} - Full file path or null if not found
 */
export function getImageFilePathById(imageId) {
  const image = getImageById(imageId);
  if (image && image.filename) {
    return path.join(IMAGES_DIR, image.filename);
  }
  // Fallback: try to find by filename pattern
  if (image && image.path) {
    // Extract filename from path
    const filename = image.path.split('/').pop();
    return path.join(IMAGES_DIR, filename);
  }
  return null;
}

/**
 * Get all product images for a category
 * @param {string} category - Product category
 * @returns {Array} - Array of image paths
 */
export function getProductImagesByCategory(category) {
  const metadata = productMetadata.get(category);
  if (metadata && metadata.images) {
    return metadata.images.map(img => ({
      id: img.id,
      path: img.path,
      filename: img.filename,
      description: img.description,
      generatedAt: img.generatedAt
    }));
  }
  return [];
}

/**
 * Get all product images
 * @returns {Object} - Object with categories as keys and images as values
 */
export function getAllProductImages() {
  const result = {};
  for (const [category, metadata] of productMetadata.entries()) {
    result[category] = metadata.images.map(img => ({
      id: img.id,
      path: img.path,
      filename: img.filename,
      description: img.description,
      generatedAt: img.generatedAt
    }));
  }
  return result;
}

/**
 * Load existing images from disk
 */
export async function loadExistingImages() {
  try {
    // Ensure directory exists first
    await fs.mkdir(IMAGES_DIR, { recursive: true });
    
    const files = await fs.readdir(IMAGES_DIR);
    const imageFiles = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
    
    for (const file of imageFiles) {
      // Extract category from filename
      const category = file.split('_')[0];
      const relativePath = `/product-images/${file}`;
      
      if (!productMetadata.has(category)) {
        productMetadata.set(category, {
          images: [],
          lastGenerated: Date.now()
        });
      }
      
      const metadata = productMetadata.get(category);
      // Check if image already in metadata
      const exists = metadata.images.some(img => img.path === relativePath);
      if (!exists) {
        const imageId = file.replace(/\.(png|jpg|jpeg)$/i, '');
        metadata.images.push({
          id: imageId,
          path: relativePath,
          filename: file,
          description: category,
          generatedAt: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    // Directory doesn't exist yet - that's fine, it will be created when needed
    if (error.code !== 'ENOENT') {
      console.error('Error loading existing images:', error);
    }
  }
}

// Load existing images on startup (don't block)
loadExistingImages().catch(() => {
  // Silently fail - directory will be created when first image is generated
});
