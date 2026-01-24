import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { sampleProducts } from './products.js';
import { getBotResponse, clearConversationHistory, getConversationHistory, getFallbackResponse } from './bot-service.js';
import { textToSpeech, textToSpeechBase64 } from './tts-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PRODUCT_API_PORT || 3006;

//uration
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

// Initialize products in Redis
async function initializeProducts() {
  try {
    if (!redisClient.isOpen) {
      console.warn('Redis not connected, skipping product initialization');
      return;
    }

    // Check if products already exist
    const existingKeys = await redisClient.keys('product:*');
    if (existingKeys.length > 0) {
      console.log(`✅ Products already initialized (${existingKeys.length} products found)`);
      return;
    }

    // Store all products in Redis
    for (const product of sampleProducts) {
      await redisClient.set(`product:${product.id}`, JSON.stringify(product));
    }

    console.log(`✅ Initialized ${sampleProducts.length} products in Redis`);
  } catch (error) {
    console.error('Error initializing products:', error);
  }
}

(async () => {
  try {
    await redisClient.connect();
    if (!redisUrl.includes('/3') && !redisUrl.includes('?db=3')) {
      await redisClient.select(3);
    }
    console.log('Redis connection established on database 3');
    // Initialize products after Redis connection
    await initializeProducts();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    console.warn('Continuing without Redis - some features may not work');
  }
})();

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Product API',
    timestamp: new Date().toISOString() 
  });
});

// Get all rooms
app.get('/api/rooms', async (req, res) => {
  try {
    if (!redisClient.isOpen) {
      return res.status(503).json({ error: 'Redis connection not available' });
    }

    const keys = await redisClient.keys('room:*');
    const rooms = [];

    for (const key of keys) {
      try {
        const roomDataStr = await redisClient.get(key);
        if (roomDataStr) {
          const roomData = JSON.parse(roomDataStr);
          rooms.push(roomData);
        }
      } catch (err) {
        console.error(`Error parsing room data for ${key}:`, err);
      }
    }

    res.json({
      success: true,
      rooms: rooms,
      count: rooms.length
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Get rooms by category
app.get('/api/rooms/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    if (!redisClient.isOpen) {
      return res.status(503).json({ error: 'Redis connection not available' });
    }

    const keys = await redisClient.keys('room:*');
    const roomsInCategory = [];

    for (const key of keys) {
      try {
        const roomDataStr = await redisClient.get(key);
        if (roomDataStr) {
          const roomData = JSON.parse(roomDataStr);
          if (roomData.productCategory === category) {
            roomsInCategory.push(roomData);
          }
        }
      } catch (err) {
        console.error(`Error parsing room data for ${key}:`, err);
      }
    }

    res.json({
      success: true,
      category: category,
      rooms: roomsInCategory,
      count: roomsInCategory.length
    });
  } catch (error) {
    console.error('Error fetching rooms for category:', error);
    res.status(500).json({ error: 'Failed to fetch rooms for category' });
  }
});

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    if (!redisClient.isOpen) {
      return res.status(503).json({ error: 'Redis connection not available' });
    }

    const keys = await redisClient.keys('room:*');
    const categories = new Set();

    for (const key of keys) {
      try {
        const roomDataStr = await redisClient.get(key);
        if (roomDataStr) {
          const roomData = JSON.parse(roomDataStr);
          if (roomData.productCategory) {
            categories.add(roomData.productCategory);
          }
        }
      } catch (err) {
        console.error(`Error parsing room data for ${key}:`, err);
      }
    }

    res.json({
      success: true,
      categories: Array.from(categories),
      count: categories.size
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get room details
app.get('/api/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!redisClient.isOpen) {
      return res.status(503).json({ error: 'Redis connection not available' });
    }

    const roomDataStr = await redisClient.get(`room:${roomId}`);
    
    if (!roomDataStr) {
      return res.status(404).json({ 
        success: false,
        error: 'Room not found' 
      });
    }

    const roomData = JSON.parse(roomDataStr);
    res.json({
      success: true,
      room: roomData
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// ==================== PRODUCT ENDPOINTS ====================

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    if (!redisClient.isOpen) {
      return res.status(503).json({ error: 'Redis connection not available' });
    }

    const keys = await redisClient.keys('product:*');
    const products = [];

    for (const key of keys) {
      try {
        const productDataStr = await redisClient.get(key);
        if (productDataStr) {
          const productData = JSON.parse(productDataStr);
          products.push(productData);
        }
      } catch (err) {
        console.error(`Error parsing product data for ${key}:`, err);
      }
    }

    // Support query parameters for pagination and sorting
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const sortBy = req.query.sortBy || 'name';
    const order = req.query.order || 'asc';

    // Sort products
    products.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (order === 'desc') {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = products.slice(startIndex, endIndex);

    res.json({
      success: true,
      products: paginatedProducts,
      count: paginatedProducts.length,
      total: products.length,
      page: page,
      totalPages: Math.ceil(products.length / limit)
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Search products
app.get('/api/products/search', async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, brand, sortBy, order, page, limit } = req.query;
    
    if (!redisClient.isOpen) {
      return res.status(503).json({ error: 'Redis connection not available' });
    }

    if (!q && !category && !minPrice && !maxPrice && !brand) {
      return res.status(400).json({ 
        error: 'Please provide at least one search parameter (q, category, minPrice, maxPrice, or brand)' 
      });
    }

    const keys = await redisClient.keys('product:*');
    let products = [];

    // Fetch all products
    for (const key of keys) {
      try {
        const productDataStr = await redisClient.get(key);
        if (productDataStr) {
          const productData = JSON.parse(productDataStr);
          products.push(productData);
        }
      } catch (err) {
        console.error(`Error parsing product data for ${key}:`, err);
      }
    }

    // Apply filters
    let filteredProducts = products.filter(product => {
      // Text search in name, description, and brand
      if (q) {
        const searchTerm = q.toLowerCase();
        const matchesSearch = 
          product.name.toLowerCase().includes(searchTerm) ||
          product.description.toLowerCase().includes(searchTerm) ||
          (product.brand && product.brand.toLowerCase().includes(searchTerm));
        if (!matchesSearch) return false;
      }

      // Category filter
      if (category) {
        if (product.category.toLowerCase() !== category.toLowerCase()) {
          return false;
        }
      }

      // Price range filter
      if (minPrice) {
        if (product.price < parseFloat(minPrice)) {
          return false;
        }
      }
      if (maxPrice) {
        if (product.price > parseFloat(maxPrice)) {
          return false;
        }
      }

      // Brand filter
      if (brand) {
        if (!product.brand || product.brand.toLowerCase() !== brand.toLowerCase()) {
          return false;
        }
      }

      return true;
    });

    // Sort products
    const sortField = sortBy || 'name';
    const sortOrder = order || 'asc';
    
    filteredProducts.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortOrder === 'desc') {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    });

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    res.json({
      success: true,
      products: paginatedProducts,
      count: paginatedProducts.length,
      total: filteredProducts.length,
      page: pageNum,
      totalPages: Math.ceil(filteredProducts.length / limitNum),
      filters: {
        query: q || null,
        category: category || null,
        minPrice: minPrice || null,
        maxPrice: maxPrice || null,
        brand: brand || null
      }
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

// Get products by category
app.get('/api/products/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    if (!redisClient.isOpen) {
      return res.status(503).json({ error: 'Redis connection not available' });
    }

    const keys = await redisClient.keys('product:*');
    const productsInCategory = [];

    for (const key of keys) {
      try {
        const productDataStr = await redisClient.get(key);
        if (productDataStr) {
          const productData = JSON.parse(productDataStr);
          if (productData.category.toLowerCase() === category.toLowerCase()) {
            productsInCategory.push(productData);
          }
        }
      } catch (err) {
        console.error(`Error parsing product data for ${key}:`, err);
      }
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = productsInCategory.slice(startIndex, endIndex);

    res.json({
      success: true,
      category: category,
      products: paginatedProducts,
      count: paginatedProducts.length,
      total: productsInCategory.length,
      page: page,
      totalPages: Math.ceil(productsInCategory.length / limit)
    });
  } catch (error) {
    console.error('Error fetching products for category:', error);
    res.status(500).json({ error: 'Failed to fetch products for category' });
  }
});

// ==================== PRODUCT IMAGES & BLEND FILES API ====================
// NOTE: These routes must be defined BEFORE /api/products/:productId to avoid route conflicts

// Get all product images organized by product name (folder name)
app.get('/api/products/images', async (req, res) => {
  try {
    const publicDir = path.join(__dirname, '..', 'public');
    const items = await fs.readdir(publicDir, { withFileTypes: true });
    
    const productImages = [];
    
    // Filter only directories (folders)
    const folders = items.filter(item => item.isDirectory() && !item.name.startsWith('.'));
    
    for (const folder of folders) {
      const folderPath = path.join(publicDir, folder.name);
      const folderContents = await fs.readdir(folderPath, { withFileTypes: true });
      
      // Find textures folder
      const texturesFolder = folderContents.find(item => 
        item.isDirectory() && item.name.toLowerCase() === 'textures'
      );
      
      if (texturesFolder) {
        const texturesPath = path.join(folderPath, texturesFolder.name);
        const textureFiles = await fs.readdir(texturesPath);
        
        // Filter only image files
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.exr'];
        const images = textureFiles
          .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return imageExtensions.includes(ext);
          })
          .map(file => ({
            filename: file,
            url: `/public/${folder.name}/textures/${file}`,
            path: path.join(texturesPath, file)
          }));
        
        if (images.length > 0) {
          // Extract product name from folder name (remove .blend suffix and _4k if present)
          const productName = folder.name
            .replace(/\.blend$/i, '')
            .replace(/_4k$/i, '')
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          
          productImages.push({
            productName: productName,
            folderName: folder.name,
            images: images,
            imageCount: images.length
          });
        }
      }
    }
    
    // Sort by product name
    productImages.sort((a, b) => a.productName.localeCompare(b.productName));
    
    res.json({
      success: true,
      products: productImages,
      totalProducts: productImages.length,
      totalImages: productImages.reduce((sum, product) => sum + product.imageCount, 0)
    });
  } catch (error) {
    console.error('Error fetching product images:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch product images'
    });
  }
});

// Get blend file information for UI display
app.get('/api/products/blends', async (req, res) => {
  try {
    const publicDir = path.join(__dirname, '..', 'public');
    const items = await fs.readdir(publicDir, { withFileTypes: true });
    
    const blendFiles = [];
    
    // Filter only directories (folders)
    const folders = items.filter(item => item.isDirectory() && !item.name.startsWith('.'));
    
    for (const folder of folders) {
      const folderPath = path.join(publicDir, folder.name);
      const folderContents = await fs.readdir(folderPath, { withFileTypes: true });
      
      // Find .blend file
      const blendFile = folderContents.find(item => 
        item.isFile() && item.name.toLowerCase().endsWith('.blend')
      );
      
      if (blendFile) {
        const blendPath = path.join(folderPath, blendFile.name);
        const stats = await fs.stat(blendPath);
        
        // Extract product name from folder name
        const productName = folder.name
          .replace(/\.blend$/i, '')
          .replace(/_4k$/i, '')
          .replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        
        // Get preview image (first diffuse texture if available)
        let previewImage = null;
        const texturesFolder = folderContents.find(item => 
          item.isDirectory() && item.name.toLowerCase() === 'textures'
        );
        
        if (texturesFolder) {
          const texturesPath = path.join(folderPath, texturesFolder.name);
          const textureFiles = await fs.readdir(texturesPath);
          const diffuseTexture = textureFiles.find(file => 
            file.toLowerCase().includes('diff') && 
            ['.jpg', '.jpeg', '.png'].includes(path.extname(file).toLowerCase())
          );
          
          if (diffuseTexture) {
            previewImage = `/public/${folder.name}/textures/${diffuseTexture}`;
          }
        }
        
        blendFiles.push({
          productName: productName,
          folderName: folder.name,
          endpointUrl: `/api/products/blends/${encodeURIComponent(folder.name)}`,
          blendFile: {
            filename: blendFile.name,
            url: `/public/${folder.name}/${blendFile.name}`,
            size: stats.size,
            sizeFormatted: formatFileSize(stats.size),
            lastModified: stats.mtime.toISOString()
          },
          previewImage: previewImage,
          hasTextures: !!texturesFolder
        });
      }
    }
    
    // Sort by product name
    blendFiles.sort((a, b) => a.productName.localeCompare(b.productName));
    
    res.json({
      success: true,
      blends: blendFiles,
      total: blendFiles.length
    });
  } catch (error) {
    console.error('Error fetching blend files:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch blend files'
    });
  }
});

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Get list of all blend folder names (helper endpoint)
app.get('/api/products/blends/folders', async (req, res) => {
  try {
    const publicDir = path.join(__dirname, '..', 'public');
    const items = await fs.readdir(publicDir, { withFileTypes: true });
    
    const folders = [];
    
    // Filter only directories (folders)
    const directories = items.filter(item => item.isDirectory() && !item.name.startsWith('.'));
    
    for (const folder of directories) {
      const folderPath = path.join(publicDir, folder.name);
      const folderContents = await fs.readdir(folderPath, { withFileTypes: true });
      
      // Check if folder contains a .blend file
      const hasBlendFile = folderContents.some(item => 
        item.isFile() && item.name.toLowerCase().endsWith('.blend')
      );
      
      if (hasBlendFile) {
        // Extract product name from folder name
        const productName = folder.name
          .replace(/\.blend$/i, '')
          .replace(/_4k$/i, '')
          .replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        
        folders.push({
          folderName: folder.name,
          productName: productName,
          endpointUrl: `/api/products/blends/${encodeURIComponent(folder.name)}`,
          encodedFolderName: encodeURIComponent(folder.name)
        });
      }
    }
    
    // Sort by product name
    folders.sort((a, b) => a.productName.localeCompare(b.productName));
    
    res.json({
      success: true,
      folders: folders,
      total: folders.length,
      message: 'Use folderName or encodedFolderName in the endpoint: /api/products/blends/:folderName'
    });
  } catch (error) {
    console.error('Error fetching blend folders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch blend folders'
    });
  }
});

// NOTE: More specific routes must be defined BEFORE the generic :folderName route
// Serve individual texture image from a blend folder (MUST be before :folderName route)
app.get('/api/products/blends/:folderName/textures/:textureName', async (req, res) => {
  try {
    let { folderName, textureName } = req.params;
    
    if (!folderName || typeof folderName !== 'string' || folderName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Folder name is required'
      });
    }

    if (!textureName || typeof textureName !== 'string' || textureName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Texture name is required'
      });
    }

    // Decode URL-encoded parameters
    folderName = decodeURIComponent(folderName);
    textureName = decodeURIComponent(textureName);

    const publicDir = path.join(__dirname, '..', 'public');
    const folderPath = path.join(publicDir, folderName);
    
    // Check if folder exists
    try {
      const folderStat = await fs.stat(folderPath);
      if (!folderStat.isDirectory()) {
        return res.status(404).json({
          success: false,
          error: `Folder not found: ${folderName}`
        });
      }
    } catch (err) {
      return res.status(404).json({
        success: false,
        error: `Folder not found: ${folderName}`,
        hint: 'Use /api/products/blends/folders to get a list of available folder names'
      });
    }

    const folderContents = await fs.readdir(folderPath, { withFileTypes: true });
    
    // Find textures folder
    const texturesFolder = folderContents.find(item => 
      item.isDirectory() && item.name.toLowerCase() === 'textures'
    );
    
    if (!texturesFolder) {
      return res.status(404).json({
        success: false,
        error: 'Textures folder not found in this blend folder'
      });
    }

    const texturesPath = path.join(folderPath, texturesFolder.name);
    const textureFilePath = path.join(texturesPath, textureName);
    
    // Check if texture file exists
    try {
      const textureStat = await fs.stat(textureFilePath);
      if (!textureStat.isFile()) {
        return res.status(404).json({
          success: false,
          error: 'Texture file not found'
        });
      }
    } catch (err) {
      return res.status(404).json({
        success: false,
        error: `Texture file not found: ${textureName}`,
        hint: 'Use /api/products/blends/:folderName to get a list of available textures'
      });
    }

    // Determine content type based on file extension
    const ext = path.extname(textureName).toLowerCase();
    let contentType = 'application/octet-stream';
    
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.exr': 'image/x-exr',
      '.hdr': 'image/vnd.radiance',
      '.tga': 'image/x-tga',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml'
    };
    
    if (contentTypes[ext]) {
      contentType = contentTypes[ext];
    }

    // Set appropriate headers
    const stats = await fs.stat(textureFilePath);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `inline; filename="${textureName}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Content-Disposition');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Send the file
    res.sendFile(textureFilePath, (err) => {
      if (err) {
        console.error('Error sending texture file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Failed to serve texture file'
          });
        }
      }
    });
    
  } catch (error) {
    console.error('Error serving texture file:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to serve texture file'
      });
    }
  }
});

// Serve the actual blend file for download/access (MUST be before :folderName route)
app.get('/api/products/blends/:folderName/file', async (req, res) => {
  try {
    let { folderName } = req.params;
    const { download } = req.query; // Optional query param to force download
    
    if (!folderName || typeof folderName !== 'string' || folderName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Folder name is required'
      });
    }

    // Decode URL-encoded folder name
    folderName = decodeURIComponent(folderName);

    const publicDir = path.join(__dirname, '..', 'public');
    const folderPath = path.join(publicDir, folderName);
    
    // Check if folder exists
    try {
      const folderStat = await fs.stat(folderPath);
      if (!folderStat.isDirectory()) {
        return res.status(404).json({
          success: false,
          error: `Folder not found: ${folderName}`
        });
      }
    } catch (err) {
      return res.status(404).json({
        success: false,
        error: `Folder not found: ${folderName}`,
        hint: 'Use /api/products/blends/folders to get a list of available folder names'
      });
    }

    const folderContents = await fs.readdir(folderPath, { withFileTypes: true });
    
    // Find .blend file
    const blendFile = folderContents.find(item => 
      item.isFile() && item.name.toLowerCase().endsWith('.blend')
    );
    
    if (!blendFile) {
      return res.status(404).json({
        success: false,
        error: 'Blend file not found in this folder'
      });
    }

    const blendFilePath = path.join(folderPath, blendFile.name);
    
    // Check if file exists
    try {
      await fs.access(blendFilePath);
    } catch (err) {
      return res.status(404).json({
        success: false,
        error: 'Blend file not found'
      });
    }

    // Set appropriate headers
    const stats = await fs.stat(blendFilePath);
    
    // Set content type for .blend files (application/octet-stream or application/x-blender)
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', stats.size);
    
    // Set filename for download
    if (download === 'true' || download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${blendFile.name}"`);
    } else {
      // Allow inline viewing/loading in virtual world
      res.setHeader('Content-Disposition', `inline; filename="${blendFile.name}"`);
      // Add CORS headers for cross-origin access
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Content-Disposition');
    }
    
    // Cache control headers
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Send the file using Express sendFile
    res.sendFile(blendFilePath, (err) => {
      if (err) {
        console.error('Error sending blend file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Failed to serve blend file'
          });
        }
      }
    });
    
  } catch (error) {
    console.error('Error serving blend file:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to serve blend file'
    });
  }
});

// Get specific blend file by folder name (MUST be after more specific routes)
app.get('/api/products/blends/:folderName', async (req, res) => {
  try {
    let { folderName } = req.params;
    
    if (!folderName || typeof folderName !== 'string' || folderName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Folder name is required'
      });
    }

    // Decode URL-encoded folder name
    folderName = decodeURIComponent(folderName);

    const publicDir = path.join(__dirname, '..', 'public');
    const folderPath = path.join(publicDir, folderName);
    
    // Check if folder exists
    try {
      const folderStat = await fs.stat(folderPath);
      if (!folderStat.isDirectory()) {
        return res.status(404).json({
          success: false,
          error: `Folder not found: ${folderName}`,
          hint: 'Use /api/products/blends/folders to get a list of available folder names'
        });
      }
    } catch (err) {
      console.error(`Folder not found: ${folderName}`, err);
      return res.status(404).json({
        success: false,
        error: `Folder not found: ${folderName}`,
        hint: 'Use /api/products/blends/folders to get a list of available folder names',
        receivedFolderName: folderName
      });
    }

    const folderContents = await fs.readdir(folderPath, { withFileTypes: true });
    
    // Find .blend file
    const blendFile = folderContents.find(item => 
      item.isFile() && item.name.toLowerCase().endsWith('.blend')
    );
    
    if (!blendFile) {
      return res.status(404).json({
        success: false,
        error: 'Blend file not found in this folder'
      });
    }

    const blendPath = path.join(folderPath, blendFile.name);
    const stats = await fs.stat(blendPath);
    
    // Extract product name from folder name
    const productName = folderName
      .replace(/\.blend$/i, '')
      .replace(/_4k$/i, '')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Get all textures
    let textures = [];
    let previewImage = null;
    const texturesFolder = folderContents.find(item => 
      item.isDirectory() && item.name.toLowerCase() === 'textures'
    );
    
    if (texturesFolder) {
      const texturesPath = path.join(folderPath, texturesFolder.name);
      const textureFiles = await fs.readdir(texturesPath);
      
      // Filter only image files
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.exr'];
      textures = textureFiles
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return imageExtensions.includes(ext);
        })
        .map(file => {
          const texturePath = path.join(texturesPath, file);
          return {
            filename: file,
            url: `/public/${folderName}/textures/${file}`,
            apiUrl: `/api/products/blends/${encodeURIComponent(folderName)}/textures/${encodeURIComponent(file)}`,
            type: getTextureType(file), // diffuse, normal, roughness, metallic, etc.
            extension: path.extname(file).toLowerCase()
          };
        });
      
      // Find preview image (first diffuse texture)
      const diffuseTexture = textures.find(tex => 
        tex.type === 'diffuse' && 
        ['.jpg', '.jpeg', '.png'].includes(tex.extension)
      );
      
      if (diffuseTexture) {
        previewImage = diffuseTexture.apiUrl; // Use API URL for preview
      } else if (textures.length > 0) {
        // Fallback to first texture if no diffuse found
        previewImage = textures[0].apiUrl;
      }
    }
    
    // Get all files in the folder (excluding textures folder)
    const allFiles = folderContents
      .filter(item => item.isFile())
      .map(item => ({
        filename: item.name,
        url: `/public/${folderName}/${item.name}`,
        extension: path.extname(item.name).toLowerCase()
      }));
    
    res.json({
      success: true,
      productName: productName,
      folderName: folderName,
      blendFile: {
        filename: blendFile.name,
        url: `/public/${folderName}/${blendFile.name}`,
        apiUrl: `/api/products/blends/${encodeURIComponent(folderName)}/file`,
        downloadUrl: `/api/products/blends/${encodeURIComponent(folderName)}/file?download=true`,
        size: stats.size,
        sizeFormatted: formatFileSize(stats.size),
        lastModified: stats.mtime.toISOString()
      },
      previewImage: previewImage,
      textures: textures,
      textureCount: textures.length,
      hasTextures: textures.length > 0,
      allFiles: allFiles,
      fileCount: allFiles.length
    });
  } catch (error) {
    console.error('Error fetching blend file:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch blend file'
    });
  }
});

// Helper function to determine texture type from filename
function getTextureType(filename) {
  const lowerName = filename.toLowerCase();
  if (lowerName.includes('diff') || lowerName.includes('diffuse') || lowerName.includes('albedo')) {
    return 'diffuse';
  } else if (lowerName.includes('nor') || lowerName.includes('normal')) {
    return 'normal';
  } else if (lowerName.includes('rough') || lowerName.includes('roughness')) {
    return 'roughness';
  } else if (lowerName.includes('metal') || lowerName.includes('metallic')) {
    return 'metallic';
  } else if (lowerName.includes('spec') || lowerName.includes('specular')) {
    return 'specular';
  } else if (lowerName.includes('ao') || lowerName.includes('ambient')) {
    return 'ambient_occlusion';
  } else if (lowerName.includes('emiss') || lowerName.includes('emission')) {
    return 'emission';
  } else if (lowerName.includes('height') || lowerName.includes('displace')) {
    return 'height';
  }
  return 'other';
}

// Get product by ID
app.get('/api/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    if (!redisClient.isOpen) {
      return res.status(503).json({ error: 'Redis connection not available' });
    }

    const productDataStr = await redisClient.get(`product:${productId}`);
    
    if (!productDataStr) {
      return res.status(404).json({ 
        success: false,
        error: 'Product not found' 
      });
    }

    const productData = JSON.parse(productDataStr);
    res.json({
      success: true,
      product: productData
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Get all product categories
app.get('/api/products/categories/list', async (req, res) => {
  try {
    if (!redisClient.isOpen) {
      return res.status(503).json({ error: 'Redis connection not available' });
    }

    const keys = await redisClient.keys('product:*');
    const categories = new Set();
    const categoryCounts = {};

    for (const key of keys) {
      try {
        const productDataStr = await redisClient.get(key);
        if (productDataStr) {
          const productData = JSON.parse(productDataStr);
          if (productData.category) {
            categories.add(productData.category);
            categoryCounts[productData.category] = (categoryCounts[productData.category] || 0) + 1;
          }
        }
      } catch (err) {
        console.error(`Error parsing product data for ${key}:`, err);
      }
    }

    const categoriesList = Array.from(categories).map(cat => ({
      name: cat,
      count: categoryCounts[cat]
    }));

    res.json({
      success: true,
      categories: categoriesList,
      count: categories.size
    });
  } catch (error) {
    console.error('Error fetching product categories:', error);
    res.status(500).json({ error: 'Failed to fetch product categories' });
  }
});

// ==================== AI BOT ENDPOINTS ====================

// Chat with AI bot (returns text and audio)
app.post('/api/bot/chat', async (req, res) => {
  try {
    const { message, roomId, includeAudio = false } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a non-empty string'
      });
    }

    if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'roomId is required and must be a non-empty string'
      });
    }

    let botResponse;
    try {
      botResponse = await getBotResponse(message.trim(), roomId.trim());
    } catch (apiError) {
      console.error('API Error, using fallback:', apiError.message);
      // Use fallback response when API fails
      try {
        botResponse = await getFallbackResponse(message.trim(), roomId.trim());
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        // Ultimate fallback
        botResponse = `I'm having some technical difficulties, but I'm here to help! We have products in Electronics, Fashion, and Books categories. What are you looking for?`;
      }
    }

    const response = {
      success: true,
      message: botResponse,
      roomId: roomId.trim()
    };

    // Generate audio if requested
    if (includeAudio) {
      try {
        const audioBase64 = await textToSpeechBase64(botResponse, 'en');
        response.audio = audioBase64;
        response.audioFormat = 'mp3';
      } catch (ttsError) {
        console.error('TTS Error:', ttsError);
        // Continue without audio if TTS fails
        response.audioError = 'Failed to generate audio';
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Error in bot chat:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get bot response'
    });
  }
});

// Get audio for text (separate endpoint)
app.post('/api/bot/audio', async (req, res) => {
  try {
    const { text, lang = 'en' } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a non-empty string'
      });
    }

    try {
      const audioBuffer = await textToSpeech(text.trim(), lang);
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.setHeader('Content-Disposition', 'inline; filename="response.mp3"');
      res.send(audioBuffer);
    } catch (ttsError) {
      console.error('TTS Error:', ttsError);
      res.status(500).json({
        success: false,
        error: 'Failed to generate audio: ' + ttsError.message
      });
    }
  } catch (error) {
    console.error('Error in audio generation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate audio'
    });
  }
});

// Clear conversation history for a room
app.delete('/api/bot/chat/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'roomId is required'
      });
    }

    clearConversationHistory(roomId.trim());

    res.json({
      success: true,
      message: `Conversation history cleared for room: ${roomId.trim()}`,
      roomId: roomId.trim()
    });
  } catch (error) {
    console.error('Error clearing conversation history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear conversation history'
    });
  }
});

// Get conversation history for a room
app.get('/api/bot/chat/:roomId/history', async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'roomId is required'
      });
    }

    const history = getConversationHistory(roomId.trim());

    res.json({
      success: true,
      roomId: roomId.trim(),
      history: history,
      count: history.length
    });
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch conversation history'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Product API Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`\n🌐 Web UI: http://localhost:${PORT}/`);
  console.log(`\n📦 Product Endpoints:`);
  console.log(`   GET  /api/products - Get all products`);
  console.log(`   GET  /api/products/search?q=query - Search products`);
  console.log(`   GET  /api/products/category/:category - Get products by category`);
  console.log(`   GET  /api/products/:productId - Get product by ID`);
  console.log(`   GET  /api/products/categories/list - Get all categories`);
  console.log(`   GET  /api/products/images - Get all product images by folder`);
  console.log(`   GET  /api/products/blends - Get blend file information for UI`);
  console.log(`   GET  /api/products/blends/folders - Get list of all blend folder names`);
  console.log(`   GET  /api/products/blends/:folderName - Get specific blend file by folder name`);
  console.log(`   GET  /api/products/blends/:folderName/file - Serve actual blend file (add ?download=true to force download)`);
  console.log(`   GET  /api/products/blends/:folderName/textures/:textureName - Serve individual texture image`);
  console.log(`\n🤖 AI Bot Endpoints:`);
  console.log(`   POST /api/bot/chat - Chat with AI bot (body: {message, roomId, includeAudio?})`);
  console.log(`   POST /api/bot/audio - Generate audio from text (body: {text, lang?})`);
  console.log(`   GET  /api/bot/chat/:roomId/history - Get conversation history`);
  console.log(`   DELETE /api/bot/chat/:roomId - Clear conversation history`);
  console.log(`\n📋 Room Endpoints (legacy):`);
  console.log(`   GET  /api/rooms - Get all rooms`);
  console.log(`   GET  /api/categories - Get categories`);
});
