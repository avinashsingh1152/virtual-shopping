import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { 
  generateProductImage, 
  generateMultipleProductImages, 
  getProductImagesByCategory, 
  getAllProductImages,
  loadExistingImages,
  getImageById
} from '../services/productImageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Simple image endpoint: GET /api/products/images/:imageName
// Returns the image file directly, no extra data
router.get('/images/:imageName', async (req, res) => {
  try {
    const { imageName } = req.params;
    const publicDir = path.join(__dirname, '../../public');
    const decodedImageName = decodeURIComponent(imageName);
    const filePath = path.join(publicDir, 'product-images', decodedImageName);
    
    // Normalize path to prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    const normalizedPublicDir = path.normalize(path.join(publicDir, 'product-images'));
    
    if (!normalizedPath.startsWith(normalizedPublicDir)) {
      return res.status(403).send('Access denied');
    }
    
    // Check if file exists
    try {
      await fs.access(normalizedPath);
    } catch (error) {
      return res.status(404).send('Image not found');
    }
    
    // Determine content type
    const ext = path.extname(normalizedPath).toLowerCase();
    const contentTypeMap = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.svg': 'image/svg+xml'
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    
    // Set headers and send file directly
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    const fileBuffer = await fs.readFile(normalizedPath);
    res.send(fileBuffer);
    
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).send('Error loading image');
  }
});

// Test endpoint to verify routes are working
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Product images API is working',
    timestamp: new Date().toISOString(),
    routes: [
      'POST /api/products/generate-image',
      'POST /api/products/generate-images',
      'GET /api/products/images',
      'GET /api/products/images/:category',
      'POST /api/products/get-or-generate',
      'GET /api/products/image/:id',
      'GET /api/products/files/all',
      'GET /api/products/files/folder/:folderName',
      'GET /api/products/files/folder/:folderName/file/:fileName',
      'GET /api/products/files/file/:fileName',
      'GET /api/products/files/:fileName (simplified - assumes product-images folder)',
      'GET /api/products/images/:imageName (simple - direct image access)'
    ]
  });
});

// Generate product image for a category
router.post('/generate-image', async (req, res) => {
  try {
    const { category, description } = req.body;
    
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    const imagePath = await generateProductImage(category, description || category);
    
    res.json({
      success: true,
      category,
      imagePath,
      message: 'Product image generated successfully'
    });
  } catch (error) {
    console.error('Error generating product image:', error);
    res.status(500).json({
      error: 'Failed to generate product image',
      message: error.message
    });
  }
});

// Generate multiple product images for different categories
router.post('/generate-images', async (req, res) => {
  try {
    const { categories } = req.body;
    
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: 'Categories array is required' });
    }

    const results = await generateMultipleProductImages(categories);
    
    res.json({
      success: true,
      results,
      message: `Generated images for ${results.filter(r => r.success).length} categories`
    });
  } catch (error) {
    console.error('Error generating product images:', error);
    res.status(500).json({
      error: 'Failed to generate product images',
      message: error.message
    });
  }
});

// Get all product images
router.get('/images', async (req, res) => {
  try {
    const allImages = getAllProductImages();
    res.json({
      success: true,
      images: allImages,
      categories: Object.keys(allImages)
    });
  } catch (error) {
    console.error('Error fetching product images:', error);
    res.status(500).json({
      error: 'Failed to fetch product images',
      message: error.message
    });
  }
});

// Get product images by category
router.get('/images/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const images = getProductImagesByCategory(category);
    
    res.json({
      success: true,
      category,
      images
    });
  } catch (error) {
    console.error('Error fetching product images by category:', error);
    res.status(500).json({
      error: 'Failed to fetch product images',
      message: error.message
    });
  }
});

// Get or generate product images for categories (auto-generate if missing)
router.post('/get-or-generate', async (req, res) => {
  try {
    const { categories } = req.body;
    
    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'Categories array is required' });
    }

    const results = [];
    
    for (const category of categories) {
      // Check if images exist for this category
      const existingImages = getProductImagesByCategory(category);
      
      if (existingImages.length > 0) {
        // Use existing images
        results.push({
          category,
          images: existingImages,
          generated: false
        });
      } else {
        // Generate new image
        try {
          const imagePath = await generateProductImage(category, `Flipkart ${category} product`);
          results.push({
            category,
            images: [{
              path: imagePath,
              description: category,
              generatedAt: new Date().toISOString()
            }],
            generated: true
          });
        } catch (error) {
          results.push({
            category,
            images: [],
            generated: false,
            error: error.message
          });
        }
      }
    }
    
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error getting or generating product images:', error);
    res.status(500).json({
      error: 'Failed to get or generate product images',
      message: error.message
    });
  }
});

// Get image by ID - serves the actual image file
router.get('/image/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Image ID is required' });
    }

    // Get image metadata
    const image = getImageById(id);
    
    if (!image) {
      return res.status(404).json({ 
        error: 'Image not found',
        message: `No image found with ID: ${id}`
      });
    }

    // Get file path - construct from public directory
    const publicDir = path.join(__dirname, '../../public');
    const imagePath = path.join(publicDir, image.path);
    
    // Normalize path to prevent directory traversal
    const normalizedPath = path.normalize(imagePath);
    if (!normalizedPath.startsWith(path.normalize(publicDir))) {
      return res.status(403).json({ 
        error: 'Invalid image path',
        message: 'Access denied'
      });
    }

    // Check if file exists
    try {
      await fs.access(normalizedPath);
    } catch (error) {
      return res.status(404).json({ 
        error: 'Image file not found on disk',
        message: `File does not exist: ${image.filename}`
      });
    }

    // Determine content type based on file extension
    const ext = path.extname(normalizedPath).toLowerCase();
    const contentTypeMap = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // Set headers and send file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${image.filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    // Read and send file
    const fileBuffer = await fs.readFile(normalizedPath);
    res.send(fileBuffer);
    
  } catch (error) {
    console.error('Error fetching image by ID:', error);
    res.status(500).json({
      error: 'Failed to fetch image',
      message: error.message
    });
  }
});

// Get image metadata by ID (returns JSON, not the image file)
router.get('/image/:id/metadata', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Image ID is required' });
    }

    const image = getImageById(id);
    
    if (!image) {
      return res.status(404).json({ 
        error: 'Image not found',
        message: `No image found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      image: {
        id: image.id,
        path: image.path,
        filename: image.filename,
        description: image.description,
        category: image.category,
        generatedAt: image.generatedAt,
        url: `/api/products/image/${image.id}`
      }
    });
  } catch (error) {
    console.error('Error fetching image metadata:', error);
    res.status(500).json({
      error: 'Failed to fetch image metadata',
      message: error.message
    });
  }
});

// Get all images from filesystem (by folder and filename)
router.get('/files/all', async (req, res) => {
  try {
    const publicDir = path.join(__dirname, '../../public');
    const productImagesDir = path.join(publicDir, 'product-images');
    
    // Check if directory exists
    try {
      await fs.access(productImagesDir);
    } catch (error) {
      return res.json({
        success: true,
        images: [],
        message: 'Product images directory does not exist'
      });
    }

    const allImages = [];
    
    // Function to recursively scan directories
    async function scanDirectory(dir, relativePath = '') {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativeFilePath = path.join(relativePath, entry.name).replace(/\\/g, '/');
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          await scanDirectory(fullPath, relativeFilePath);
        } else if (entry.isFile()) {
          // Check if it's an image file
          const ext = path.extname(entry.name).toLowerCase();
          if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg'].includes(ext)) {
            const stats = await fs.stat(fullPath);
            allImages.push({
              folder: relativePath ? relativePath.split('/')[0] : 'product-images',
              folderPath: relativePath ? `product-images/${relativePath}` : 'product-images',
              filename: entry.name,
              filepath: `product-images/${relativeFilePath}`,
              url: `/api/products/files/folder/${relativePath ? relativePath.split('/')[0] : 'product-images'}/file/${entry.name}`,
              size: stats.size,
              modifiedAt: stats.mtime.toISOString(),
              extension: ext
            });
          }
        }
      }
    }
    
    await scanDirectory(productImagesDir);
    
    res.json({
      success: true,
      total: allImages.length,
      images: allImages,
      folders: [...new Set(allImages.map(img => img.folder))]
    });
  } catch (error) {
    console.error('Error fetching all images:', error);
    res.status(500).json({
      error: 'Failed to fetch images',
      message: error.message
    });
  }
});

// Get images by folder name
router.get('/files/folder/:folderName', async (req, res) => {
  try {
    const { folderName } = req.params;
    const publicDir = path.join(__dirname, '../../public');
    
    // If folderName is 'product-images' or empty, list files directly in product-images
    let folderPath;
    if (folderName === 'product-images' || folderName === '') {
      folderPath = path.join(publicDir, 'product-images');
    } else {
      folderPath = path.join(publicDir, 'product-images', folderName);
    }
    
    // Normalize path to prevent directory traversal
    const normalizedPath = path.normalize(folderPath);
    const normalizedPublicDir = path.normalize(path.join(publicDir, 'product-images'));
    
    if (!normalizedPath.startsWith(normalizedPublicDir)) {
      return res.status(403).json({
        error: 'Invalid folder path',
        message: 'Access denied'
      });
    }
    
    // Check if folder exists
    try {
      const stats = await fs.stat(normalizedPath);
      if (!stats.isDirectory()) {
        return res.status(400).json({
          error: 'Not a directory',
          message: `${folderName} is not a directory`
        });
      }
    } catch (error) {
      return res.status(404).json({
        error: 'Folder not found',
        message: `Folder "${folderName}" does not exist`
      });
    }
    
    // Read directory
    const entries = await fs.readdir(normalizedPath, { withFileTypes: true });
    const images = [];
    
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg'].includes(ext)) {
          const filePath = path.join(normalizedPath, entry.name);
          const stats = await fs.stat(filePath);
          const actualFolder = folderName === 'product-images' || folderName === '' ? 'product-images' : folderName;
          images.push({
            folder: actualFolder,
            filename: entry.name,
            filepath: folderName === 'product-images' || folderName === '' 
              ? `product-images/${entry.name}` 
              : `product-images/${folderName}/${entry.name}`,
            url: `/api/products/files/folder/${actualFolder}/file/${entry.name}`,
            size: stats.size,
            modifiedAt: stats.mtime.toISOString(),
            extension: ext
          });
        }
      }
    }
    
    res.json({
      success: true,
      folder: folderName === 'product-images' || folderName === '' ? 'product-images' : folderName,
      total: images.length,
      images
    });
  } catch (error) {
    console.error('Error fetching images by folder:', error);
    res.status(500).json({
      error: 'Failed to fetch images',
      message: error.message
    });
  }
});

// Get specific image by folder name and filename
router.get('/files/folder/:folderName/file/:fileName', async (req, res) => {
  try {
    const { folderName, fileName } = req.params;
    const publicDir = path.join(__dirname, '../../public');
    
    // Decode URL-encoded filenames
    const decodedFileName = decodeURIComponent(fileName);
    
    // If folderName is 'product-images', look directly in product-images folder
    let filePath;
    if (folderName === 'product-images' || folderName === '') {
      filePath = path.join(publicDir, 'product-images', decodedFileName);
    } else {
      filePath = path.join(publicDir, 'product-images', folderName, decodedFileName);
    }
    
    // Normalize path to prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    const normalizedPublicDir = path.normalize(path.join(publicDir, 'product-images'));
    
    if (!normalizedPath.startsWith(normalizedPublicDir)) {
      return res.status(403).json({
        error: 'Invalid file path',
        message: 'Access denied'
      });
    }
    
    // Check if file exists
    try {
      await fs.access(normalizedPath);
    } catch (error) {
      console.error(`File not found: ${normalizedPath}`, error);
      return res.status(404).json({
        error: 'File not found',
        message: `File "${decodedFileName}" not found in folder "${folderName}"`,
        attemptedPath: normalizedPath
      });
    }
    
    // Determine content type
    const ext = path.extname(normalizedPath).toLowerCase();
    const contentTypeMap = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.svg': 'image/svg+xml'
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    
    // Set headers and send file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${decodedFileName}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    const fileBuffer = await fs.readFile(normalizedPath);
    res.send(fileBuffer);
    
  } catch (error) {
    console.error('Error fetching image file:', error);
    res.status(500).json({
      error: 'Failed to fetch image',
      message: error.message
    });
  }
});

// Get image by filename (searches in all folders)
router.get('/files/file/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const publicDir = path.join(__dirname, '../../public');
    const productImagesDir = path.join(publicDir, 'product-images');
    
    // Decode URL-encoded filename
    const decodedFileName = decodeURIComponent(fileName);
    
    // Function to search for file recursively
    async function findFile(dir, targetFileName, currentPath = '') {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        
        if (entry.isDirectory()) {
          const found = await findFile(fullPath, targetFileName, relativePath);
          if (found) return found;
        } else if (entry.name === targetFileName || entry.name === decodeURIComponent(targetFileName)) {
          return {
            folder: currentPath || 'product-images',
            filePath: fullPath,
            relativePath: `product-images/${relativePath}`
          };
        }
      }
      return null;
    }
    
    const found = await findFile(productImagesDir, decodedFileName);
    
    if (!found) {
      return res.status(404).json({
        error: 'File not found',
        message: `File "${decodedFileName}" not found in any folder`
      });
    }
    
    // Determine content type
    const ext = path.extname(found.filePath).toLowerCase();
    const contentTypeMap = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.svg': 'image/svg+xml'
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    
    // Set headers and send file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${decodedFileName}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    const fileBuffer = await fs.readFile(found.filePath);
    res.send(fileBuffer);
    
  } catch (error) {
    console.error('Error fetching image by filename:', error);
    res.status(500).json({
      error: 'Failed to fetch image',
      message: error.message
    });
  }
});

// Simplified endpoint: Get image directly by filename (assumes product-images folder)
router.get('/files/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const publicDir = path.join(__dirname, '../../public');
    const decodedFileName = decodeURIComponent(fileName);
    const filePath = path.join(publicDir, 'product-images', decodedFileName);
    
    // Normalize path to prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    const normalizedPublicDir = path.normalize(path.join(publicDir, 'product-images'));
    
    if (!normalizedPath.startsWith(normalizedPublicDir)) {
      return res.status(403).json({
        error: 'Invalid file path',
        message: 'Access denied'
      });
    }
    
    // Check if file exists
    try {
      await fs.access(normalizedPath);
    } catch (error) {
      return res.status(404).json({
        error: 'File not found',
        message: `File "${decodedFileName}" not found`
      });
    }
    
    // Determine content type
    const ext = path.extname(normalizedPath).toLowerCase();
    const contentTypeMap = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.svg': 'image/svg+xml'
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    
    // Set headers and send file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${decodedFileName}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    const fileBuffer = await fs.readFile(normalizedPath);
    res.send(fileBuffer);
    
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({
      error: 'Failed to fetch image',
      message: error.message
    });
  }
});

export { router as productImagesRouter };
