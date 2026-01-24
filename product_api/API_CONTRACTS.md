# API Contracts Documentation

This document defines the contracts for all API endpoints in the Product API service.

---

## Table of Contents
1. [Product Search API](#product-search-api)
2. [Socket/WebSocket API](#socketwebsocket-api)
3. [Common Response Formats](#common-response-formats)
4. [Error Handling](#error-handling)

---

## Product Search API

### Base URL
```
http://localhost:3006/api/products
```
*(Port may vary based on `PRODUCT_API_PORT` environment variable)*

---

### 1. Get All Products

**Endpoint:** `GET /api/products`

**Description:** Retrieves all products with optional pagination and sorting.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number for pagination |
| `limit` | integer | No | 50 | Number of products per page |
| `sortBy` | string | No | 'name' | Field to sort by (name, price, rating, category) |
| `order` | string | No | 'asc' | Sort order ('asc' or 'desc') |

**Request Example:**
```http
GET /api/products?page=1&limit=20&sortBy=price&order=desc
```

**Response (200 OK):**
```json
{
  "success": true,
  "products": [
    {
      "id": "prod-1",
      "name": "Product Name",
      "description": "Product description",
      "category": "Electronics",
      "price": 299.99,
      "rating": 4.5,
      "stock": 50,
      "brand": "Brand Name",
      "image": "https://example.com/image.jpg"
    }
  ],
  "count": 20,
  "total": 50,
  "page": 1,
  "totalPages": 3
}
```

---

### 2. Search Products

**Endpoint:** `GET /api/products/search`

**Description:** Search products with multiple filters (text search, category, price range, brand).

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | No* | - | Text search in name, description, or brand |
| `category` | string | No* | - | Filter by category (case-insensitive) |
| `minPrice` | number | No | - | Minimum price filter |
| `maxPrice` | number | No | - | Maximum price filter |
| `brand` | string | No* | - | Filter by brand name (case-insensitive) |
| `sortBy` | string | No | 'name' | Field to sort by |
| `order` | string | No | 'asc' | Sort order ('asc' or 'desc') |
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 20 | Results per page |

*At least one of `q`, `category`, `minPrice`, `maxPrice`, or `brand` must be provided.

**Request Examples:**
```http
# Text search
GET /api/products/search?q=smartphone

# Category filter
GET /api/products/search?category=Electronics

# Price range
GET /api/products/search?minPrice=100&maxPrice=500

# Combined filters
GET /api/products/search?q=laptop&category=Electronics&minPrice=500&maxPrice=2000&sortBy=price&order=desc&page=1&limit=10

# Brand filter
GET /api/products/search?brand=Samsung
```

**Response (200 OK):**
```json
{
  "success": true,
  "products": [
    {
      "id": "prod-1",
      "name": "Product Name",
      "description": "Product description",
      "category": "Electronics",
      "price": 299.99,
      "rating": 4.5,
      "stock": 50,
      "brand": "Brand Name",
      "image": "https://example.com/image.jpg"
    }
  ],
  "count": 10,
  "total": 25,
  "page": 1,
  "totalPages": 3,
  "filters": {
    "query": "laptop",
    "category": "Electronics",
    "minPrice": "500",
    "maxPrice": "2000",
    "brand": null
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Please provide at least one search parameter (q, category, minPrice, maxPrice, or brand)"
}
```

---

### 3. Get Products by Category

**Endpoint:** `GET /api/products/category/:category`

**Description:** Get all products in a specific category.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | Yes | Category name (case-insensitive) |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 50 | Results per page |

**Request Example:**
```http
GET /api/products/category/Electronics?page=1&limit=20
```

**Response (200 OK):**
```json
{
  "success": true,
  "category": "Electronics",
  "products": [...],
  "count": 20,
  "total": 50,
  "page": 1,
  "totalPages": 3
}
```

---

### 4. Get Product by ID

**Endpoint:** `GET /api/products/:productId`

**Description:** Get detailed information about a specific product.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `productId` | string | Yes | Unique product identifier |

**Request Example:**
```http
GET /api/products/prod-1
```

**Response (200 OK):**
```json
{
  "success": true,
  "product": {
    "id": "prod-1",
    "name": "Product Name",
    "description": "Product description",
    "category": "Electronics",
    "price": 299.99,
    "rating": 4.5,
    "stock": 50,
    "brand": "Brand Name",
    "image": "https://example.com/image.jpg"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Product not found"
}
```

---

### 5. Get All Categories

**Endpoint:** `GET /api/products/categories/list`

**Description:** Get list of all product categories with product counts.

**Request Example:**
```http
GET /api/products/categories/list
```

**Response (200 OK):**
```json
{
  "success": true,
  "categories": [
    {
      "name": "Electronics",
      "count": 20
    },
    {
      "name": "Fashion",
      "count": 15
    },
    {
      "name": "Books",
      "count": 15
    }
  ],
  "count": 3
}
```

---

### 6. Get All Product Images

**Endpoint:** `GET /api/products/images`

**Description:** Get all product images organized by product name (folder name). Scans the `public/` directory for folders containing texture images and returns them grouped by product.

**Request Example:**
```http
GET /api/products/images
```

**Response (200 OK):**
```json
{
  "success": true,
  "products": [
    {
      "productName": "Chess Set",
      "folderName": "chess_set_4k.blend",
      "images": [
        {
          "filename": "chess_set_board_diff_4k.png",
          "url": "/public/chess_set_4k.blend/textures/chess_set_board_diff_4k.png",
          "path": "/path/to/public/chess_set_4k.blend/textures/chess_set_board_diff_4k.png"
        },
        {
          "filename": "chess_set_board_nor_gl_4k.png",
          "url": "/public/chess_set_4k.blend/textures/chess_set_board_nor_gl_4k.png",
          "path": "/path/to/public/chess_set_4k.blend/textures/chess_set_board_nor_gl_4k.png"
        }
      ],
      "imageCount": 9
    },
    {
      "productName": "Drill 01",
      "folderName": "Drill_01_4k.blend",
      "images": [
        {
          "filename": "Drill_01_diff_4k.jpg",
          "url": "/public/Drill_01_4k.blend/textures/Drill_01_diff_4k.jpg",
          "path": "/path/to/public/Drill_01_4k.blend/textures/Drill_01_diff_4k.jpg"
        }
      ],
      "imageCount": 5
    }
  ],
  "totalProducts": 8,
  "totalImages": 45
}
```

**Notes:**
- Only scans folders in the `public/` directory
- Looks for `textures/` subfolder in each product folder
- Supports image formats: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.exr`
- Product names are automatically formatted from folder names (removes `.blend` suffix and `_4k`, converts underscores to spaces, capitalizes words)
- Results are sorted alphabetically by product name

---

### 7. Get Blend Files for UI

**Endpoint:** `GET /api/products/blends`

**Description:** Get all Blender (.blend) file information for UI display. Returns blend file details including size, preview images, and metadata.

**Request Example:**
```http
GET /api/products/blends
```

**Response (200 OK):**
```json
{
  "success": true,
  "blends": [
    {
      "productName": "Chess Set",
      "folderName": "chess_set_4k.blend",
      "blendFile": {
        "filename": "chess_set_4k.blend",
        "url": "/public/chess_set_4k.blend/chess_set_4k.blend",
        "apiUrl": "/api/products/blends/chess_set_4k.blend/file",
        "downloadUrl": "/api/products/blends/chess_set_4k.blend/file?download=true",
        "size": 5242880,
        "sizeFormatted": "5 MB",
        "lastModified": "2024-01-15T10:30:00.000Z"
      },
      "previewImage": "/public/chess_set_4k.blend/textures/chess_set_board_diff_4k.png",
      "hasTextures": true
    },
    {
      "productName": "Drill 01",
      "folderName": "Drill_01_4k.blend",
      "blendFile": {
        "filename": "Drill_01_4k.blend",
        "url": "/public/Drill_01_4k.blend/Drill_01_4k.blend",
        "size": 8388608,
        "sizeFormatted": "8 MB",
        "lastModified": "2024-01-15T10:25:00.000Z"
      },
      "previewImage": "/public/Drill_01_4k.blend/textures/Drill_01_diff_4k.jpg",
      "hasTextures": true
    }
  ],
  "total": 8
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `productName` | string | Formatted product name (from folder name) |
| `folderName` | string | Original folder name (use this in the endpoint URL) |
| `endpointUrl` | string | Direct endpoint URL to fetch this specific blend file |
| `blendFile.filename` | string | Blend file name |
| `blendFile.url` | string | Public URL to access the blend file |
| `blendFile.size` | number | File size in bytes |
| `blendFile.sizeFormatted` | string | Human-readable file size (e.g., "5 MB") |
| `blendFile.lastModified` | string | ISO timestamp of last modification |
| `previewImage` | string\|null | URL to preview image (first diffuse texture found) |
| `hasTextures` | boolean | Whether the product folder contains a textures folder |

**Notes:**
- Only scans folders in the `public/` directory
- Automatically finds the first diffuse texture (contains "diff" in filename) as preview image
- Product names are automatically formatted from folder names
- Results are sorted alphabetically by product name
- Preview images are prioritized: looks for `.jpg`, `.jpeg`, or `.png` files with "diff" in the name

---

### 8. Get List of Blend Folder Names

**Endpoint:** `GET /api/products/blends/folders`

**Description:** Get a list of all available blend folder names. Useful for discovering which folder names can be used with the specific blend endpoint.

**Request Example:**
```http
GET /api/products/blends/folders
```

**Response (200 OK):**
```json
{
  "success": true,
  "folders": [
    {
      "folderName": "chess_set_4k.blend",
      "productName": "Chess Set",
      "endpointUrl": "/api/products/blends/chess_set_4k.blend",
      "encodedFolderName": "chess_set_4k.blend"
    },
    {
      "folderName": "WoodenTable_02_4k.blend",
      "productName": "Wooden Table 02",
      "endpointUrl": "/api/products/blends/WoodenTable_02_4k.blend",
      "encodedFolderName": "WoodenTable_02_4k.blend"
    }
  ],
  "total": 8,
  "message": "Use folderName or encodedFolderName in the endpoint: /api/products/blends/:folderName"
}
```

**Notes:**
- Returns all folders that contain `.blend` files
- Includes both raw and URL-encoded folder names
- Provides direct endpoint URLs for each folder
- Use `folderName` or `encodedFolderName` when calling the specific blend endpoint

---

### 9. Get Specific Blend File by Folder Name

**Endpoint:** `GET /api/products/blends/:folderName`

**Description:** Get detailed information about a specific blend file by its folder name. Returns the blend file details, all textures, and all files in the folder.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `folderName` | string | Yes | Folder name (e.g., "chess_set_4k.blend" or "WoodenTable_02_4k.blend"). URL encoding is handled automatically. |

**Important:** 
- Use the exact `folderName` from `/api/products/blends` or `/api/products/blends/folders` response
- Folder names with special characters (like underscores, dots) are automatically URL-encoded/decoded
- If you get a 404, check `/api/products/blends/folders` to get the correct folder name

**Request Example:**
```http
GET /api/products/blends/chess_set_4k.blend
```

**Response (200 OK):**
```json
{
  "success": true,
  "productName": "Chess Set",
  "folderName": "chess_set_4k.blend",
  "blendFile": {
    "filename": "chess_set_4k.blend",
    "url": "/public/chess_set_4k.blend/chess_set_4k.blend",
    "size": 5242880,
    "sizeFormatted": "5 MB",
    "lastModified": "2024-01-15T10:30:00.000Z"
  },
  "previewImage": "/public/chess_set_4k.blend/textures/chess_set_board_diff_4k.png",
  "textures": [
    {
      "filename": "chess_set_board_diff_4k.png",
      "url": "/public/chess_set_4k.blend/textures/chess_set_board_diff_4k.png",
      "type": "diffuse",
      "extension": ".png"
    },
    {
      "filename": "chess_set_board_nor_gl_4k.png",
      "url": "/public/chess_set_4k.blend/textures/chess_set_board_nor_gl_4k.png",
      "type": "normal",
      "extension": ".png"
    },
    {
      "filename": "chess_set_board_rough_4k.png",
      "url": "/public/chess_set_4k.blend/textures/chess_set_board_rough_4k.png",
      "type": "roughness",
      "extension": ".png"
    }
  ],
  "textureCount": 9,
  "hasTextures": true,
  "allFiles": [
    {
      "filename": "chess_set_4k.blend",
      "url": "/public/chess_set_4k.blend/chess_set_4k.blend",
      "extension": ".blend"
    }
  ],
  "fileCount": 1
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `productName` | string | Formatted product name (from folder name) |
| `folderName` | string | Original folder name |
| `blendFile` | object | Blend file information (filename, url, apiUrl, downloadUrl, size, sizeFormatted, lastModified) |
| `blendFile.apiUrl` | string | Direct API URL to stream the blend file |
| `blendFile.downloadUrl` | string | API URL with download parameter for forced download |
| `previewImage` | string\|null | URL to preview image (first diffuse texture found) |
| `textures` | array | Array of all texture files with type classification |
| `textures[].filename` | string | Texture filename |
| `textures[].url` | string | Public URL to access the texture |
| `textures[].apiUrl` | string | Direct API URL to serve the texture image |
| `textures[].type` | string | Texture type: "diffuse", "normal", "roughness", "metallic", "specular", "ambient_occlusion", "emission", "height", or "other" |
| `textures[].extension` | string | File extension |
| `textureCount` | number | Total number of texture files |
| `hasTextures` | boolean | Whether textures folder exists |
| `allFiles` | array | All files in the folder (excluding textures subfolder) |
| `allFiles[].filename` | string | Filename |
| `allFiles[].url` | string | Public URL to access the file |
| `allFiles[].extension` | string | File extension |
| `fileCount` | number | Total number of files in the folder |

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Folder not found: WoodenTable_02_4k.blend",
  "hint": "Use /api/products/blends/folders to get a list of available folder names",
  "receivedFolderName": "WoodenTable_02_4k.blend"
}
```

**Error Response (404 Not Found - No Blend File):**
```json
{
  "success": false,
  "error": "Blend file not found in this folder"
}
```

**Texture Type Detection:**
The API automatically detects texture types based on filename patterns:
- `diffuse` / `diff` / `albedo` → Diffuse/Albedo texture
- `normal` / `nor` → Normal map
- `roughness` / `rough` → Roughness map
- `metallic` / `metal` → Metallic map
- `specular` / `spec` → Specular map
- `ambient_occlusion` / `ao` → Ambient occlusion map
- `emission` / `emiss` → Emission map
- `height` / `displace` → Height/Displacement map
- `other` → Unknown texture type

**Notes:**
- Folder name must match exactly (case-sensitive)
- Returns detailed information about a single blend file
- Includes all textures with automatic type classification
- Lists all files in the folder (not just textures)
- Preview image is automatically selected from diffuse textures
- Response includes `apiUrl` and `downloadUrl` for direct file access

---

### 10. Serve Blend File (Download/Stream)

**Endpoint:** `GET /api/products/blends/:folderName/file`

**Description:** Serves the actual `.blend` file for download or direct access in virtual worlds. This endpoint streams the binary blend file with appropriate headers.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `folderName` | string | Yes | Folder name (e.g., "chess_set_4k.blend" or "WoodenTable_02_4k.blend") |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `download` | string | No | false | Set to `true` or `1` to force download instead of inline viewing |

**Request Examples:**
```http
# Stream file for virtual world (inline)
GET /api/products/blends/chess_set_4k.blend/file

# Force download
GET /api/products/blends/chess_set_4k.blend/file?download=true

# With URL encoding
GET /api/products/blends/WoodenTable_02_4k.blend/file
```

**Response:**
- **Content-Type:** `application/octet-stream`
- **Content-Length:** File size in bytes
- **Content-Disposition:** 
  - Inline: `inline; filename="chess_set_4k.blend"` (for virtual world loading)
  - Download: `attachment; filename="chess_set_4k.blend"` (when `download=true`)
- **Access-Control-Allow-Origin:** `*` (for CORS)
- **Cache-Control:** `public, max-age=3600` (cached for 1 hour)

**Body:** Binary `.blend` file content

**Usage in Virtual World:**
```javascript
// Example: Load blend file in Three.js or similar
const blendUrl = 'http://localhost:3006/api/products/blends/chess_set_4k.blend/file';

// Or use fetch
fetch(blendUrl)
  .then(response => response.blob())
  .then(blob => {
    const url = URL.createObjectURL(blob);
    // Use the URL to load in your 3D engine
    loadBlendFile(url);
  });
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Folder not found: WoodenTable_02_4k.blend",
  "hint": "Use /api/products/blends/folders to get a list of available folder names"
}
```

**Error Response (404 Not Found - No Blend File):**
```json
{
  "success": false,
  "error": "Blend file not found in this folder"
}
```

**Notes:**
- The file is streamed directly, suitable for large files
- CORS headers are included for cross-origin access
- Use `?download=true` to force browser download
- Without `download` parameter, file can be loaded inline in virtual worlds
- File is cached for 1 hour to improve performance
- URL encoding is automatically handled

---

### 11. Serve Texture Image from Blend Folder

**Endpoint:** `GET /api/products/blends/:folderName/textures/:textureName`

**Description:** Serves individual texture images (diffuse, normal, roughness, metallic, etc.) from a blend folder's textures directory. Perfect for loading textures in virtual worlds or 3D applications.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `folderName` | string | Yes | Folder name (e.g., "chess_set_4k.blend" or "WoodenTable_02_4k.blend") |
| `textureName` | string | Yes | Texture filename (e.g., "chess_set_board_diff_4k.png") |

**Request Examples:**
```http
# Get diffuse texture
GET /api/products/blends/chess_set_4k.blend/textures/chess_set_board_diff_4k.png

# Get normal map
GET /api/products/blends/chess_set_4k.blend/textures/chess_set_board_nor_gl_4k.png

# Get roughness map
GET /api/products/blends/chess_set_4k.blend/textures/chess_set_board_rough_4k.png

# With URL encoding
GET /api/products/blends/WoodenTable_02_4k.blend/textures/WoodenTable_02_diff_4k.jpg
```

**Response:**
- **Content-Type:** Automatically determined based on file extension:
  - `.jpg`, `.jpeg` → `image/jpeg`
  - `.png` → `image/png`
  - `.gif` → `image/gif`
  - `.webp` → `image/webp`
  - `.exr` → `image/x-exr`
  - `.hdr` → `image/vnd.radiance`
  - `.tga` → `image/x-tga`
  - `.bmp` → `image/bmp`
  - `.svg` → `image/svg+xml`
  - Other → `application/octet-stream`
- **Content-Length:** File size in bytes
- **Content-Disposition:** `inline; filename="texture_name.ext"`
- **Access-Control-Allow-Origin:** `*` (for CORS)
- **Cache-Control:** `public, max-age=3600` (cached for 1 hour)

**Body:** Binary image file content

**Usage in Virtual World:**
```javascript
// Example: Load texture in Three.js
const textureUrl = 'http://localhost:3006/api/products/blends/chess_set_4k.blend/textures/chess_set_board_diff_4k.png';

// Using Three.js TextureLoader
const loader = new THREE.TextureLoader();
loader.load(textureUrl, (texture) => {
  material.map = texture;
  material.needsUpdate = true;
});

// Or using fetch
fetch(textureUrl)
  .then(response => response.blob())
  .then(blob => {
    const url = URL.createObjectURL(blob);
    // Use the URL in your texture loader
    loadTexture(url);
  });
```

**Error Response (404 Not Found - Folder):**
```json
{
  "success": false,
  "error": "Folder not found: WoodenTable_02_4k.blend",
  "hint": "Use /api/products/blends/folders to get a list of available folder names"
}
```

**Error Response (404 Not Found - No Textures Folder):**
```json
{
  "success": false,
  "error": "Textures folder not found in this blend folder"
}
```

**Error Response (404 Not Found - Texture File):**
```json
{
  "success": false,
  "error": "Texture file not found: chess_set_board_diff_4k.png",
  "hint": "Use /api/products/blends/:folderName to get a list of available textures"
}
```

**Notes:**
- Content type is automatically determined from file extension
- CORS headers are included for cross-origin access
- Images are cached for 1 hour to improve performance
- URL encoding is automatically handled for both folder and texture names
- Use `/api/products/blends/:folderName` to get a list of all available textures with their `apiUrl`
- Supported formats: JPG, PNG, GIF, WebP, EXR, HDR, TGA, BMP, SVG

**Updated Response in `/api/products/blends/:folderName`:**
The textures array now includes `apiUrl` for each texture:
```json
{
  "textures": [
    {
      "filename": "chess_set_board_diff_4k.png",
      "url": "/public/chess_set_4k.blend/textures/chess_set_board_diff_4k.png",
      "apiUrl": "/api/products/blends/chess_set_4k.blend/textures/chess_set_board_diff_4k.png",
      "type": "diffuse",
      "extension": ".png"
    }
  ]
}
```

---

## Socket/WebSocket API

### Connection

**WebSocket URL:**
```
ws://localhost:3006
```
*(Port may vary based on `PRODUCT_API_PORT` environment variable)*

**Connection:**
```javascript
const socket = io('http://localhost:3006', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

---

### Events

#### Client → Server Events

##### 1. Join Room
**Event:** `join_room`

**Description:** Join a chat room for conversation management.

**Payload:**
```json
{
  "roomId": "room-123",
  "userId": "user-456" // optional
}
```

**Example:**
```javascript
socket.emit('join_room', {
  roomId: 'room-123',
  userId: 'user-456'
});
```

---

##### 2. Send Message
**Event:** `send_message`

**Description:** Send a message to the AI bot.

**Payload:**
```json
{
  "message": "I'm looking for a smartphone",
  "roomId": "room-123",
  "includeAudio": false // optional, default: false
}
```

**Example:**
```javascript
socket.emit('send_message', {
  message: "I'm looking for a smartphone",
  roomId: 'room-123',
  includeAudio: true
});
```

---

##### 3. Get History
**Event:** `get_history`

**Description:** Request conversation history for a room.

**Payload:**
```json
{
  "roomId": "room-123"
}
```

**Example:**
```javascript
socket.emit('get_history', {
  roomId: 'room-123'
});
```

---

##### 4. Clear History
**Event:** `clear_history`

**Description:** Clear conversation history for a room.

**Payload:**
```json
{
  "roomId": "room-123"
}
```

**Example:**
```javascript
socket.emit('clear_history', {
  roomId: 'room-123'
});
```

---

##### 5. Search Products
**Event:** `search_products`

**Description:** Search products via WebSocket.

**Payload:**
```json
{
  "query": "laptop", // optional
  "category": "Electronics", // optional
  "minPrice": 100, // optional
  "maxPrice": 500, // optional
  "brand": "Samsung", // optional
  "sortBy": "price", // optional, default: "name"
  "order": "desc", // optional, default: "asc"
  "page": 1, // optional, default: 1
  "limit": 20 // optional, default: 20
}
```

**Example:**
```javascript
socket.emit('search_products', {
  query: 'laptop',
  category: 'Electronics',
  minPrice: 500,
  maxPrice: 2000,
  sortBy: 'price',
  order: 'desc',
  page: 1,
  limit: 10
});
```

---

##### 6. Get Product
**Event:** `get_product`

**Description:** Get a specific product by ID.

**Payload:**
```json
{
  "productId": "prod-1"
}
```

**Example:**
```javascript
socket.emit('get_product', {
  productId: 'prod-1'
});
```

---

##### 7. Disconnect
**Event:** `disconnect`

**Description:** Client disconnects from the server (automatic).

---

#### Server → Client Events

##### 1. Room Joined
**Event:** `room_joined`

**Description:** Confirmation that client has joined a room.

**Payload:**
```json
{
  "success": true,
  "roomId": "room-123",
  "message": "Successfully joined room",
  "history": [...] // optional, conversation history
}
```

**Example:**
```javascript
socket.on('room_joined', (data) => {
  console.log('Joined room:', data.roomId);
  if (data.history) {
    console.log('History:', data.history);
  }
});
```

---

##### 2. Bot Response
**Event:** `bot_response`

**Description:** AI bot response to a message.

**Payload:**
```json
{
  "success": true,
  "message": "I found several smartphones for you...",
  "roomId": "room-123",
  "audio": "base64-encoded-audio-string", // optional, if includeAudio was true
  "audioFormat": "mp3", // optional
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Example:**
```javascript
socket.on('bot_response', (data) => {
  console.log('Bot:', data.message);
  if (data.audio) {
    // Play audio
    const audio = new Audio('data:audio/mpeg;base64,' + data.audio);
    audio.play();
  }
});
```

---

##### 3. History Response
**Event:** `history_response`

**Description:** Conversation history for a room.

**Payload:**
```json
{
  "success": true,
  "roomId": "room-123",
  "history": [
    {
      "role": "user",
      "message": "I'm looking for a smartphone",
      "timestamp": "2024-01-15T10:25:00Z"
    },
    {
      "role": "bot",
      "message": "I found several smartphones...",
      "timestamp": "2024-01-15T10:25:05Z"
    }
  ],
  "count": 2
}
```

**Example:**
```javascript
socket.on('history_response', (data) => {
  console.log('History:', data.history);
  data.history.forEach(msg => {
    console.log(`${msg.role}: ${msg.message}`);
  });
});
```

---

##### 4. History Cleared
**Event:** `history_cleared`

**Description:** Confirmation that history was cleared.

**Payload:**
```json
{
  "success": true,
  "roomId": "room-123",
  "message": "Conversation history cleared"
}
```

**Example:**
```javascript
socket.on('history_cleared', (data) => {
  console.log('History cleared for room:', data.roomId);
});
```

---

##### 5. Products Search Result
**Event:** `products_search_result`

**Description:** Product search results.

**Payload:**
```json
{
  "success": true,
  "products": [
    {
      "id": "prod-1",
      "name": "Product Name",
      "description": "Product description",
      "category": "Electronics",
      "price": 299.99,
      "rating": 4.5,
      "stock": 50,
      "brand": "Brand Name",
      "image": "https://example.com/image.jpg"
    }
  ],
  "count": 10,
  "total": 25,
  "page": 1,
  "totalPages": 3,
  "filters": {
    "query": "laptop",
    "category": "Electronics",
    "minPrice": 500,
    "maxPrice": 2000,
    "brand": null
  }
}
```

**Example:**
```javascript
socket.on('products_search_result', (data) => {
  console.log(`Found ${data.count} products`);
  data.products.forEach(product => {
    console.log(`${product.name} - $${product.price}`);
  });
});
```

---

##### 6. Product Response
**Event:** `product_response`

**Description:** Single product details.

**Payload:**
```json
{
  "success": true,
  "product": {
    "id": "prod-1",
    "name": "Product Name",
    "description": "Product description",
    "category": "Electronics",
    "price": 299.99,
    "rating": 4.5,
    "stock": 50,
    "brand": "Brand Name",
    "image": "https://example.com/image.jpg"
  }
}
```

**Example:**
```javascript
socket.on('product_response', (data) => {
  console.log('Product:', data.product.name);
  console.log('Price:', data.product.price);
});
```

---

##### 7. Error
**Event:** `error`

**Description:** Error response for any failed operation.

**Payload:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE", // optional
  "event": "send_message" // original event that caused the error
}
```

**Example:**
```javascript
socket.on('error', (data) => {
  console.error('Error:', data.error);
  console.error('Event:', data.event);
});
```

---

##### 8. Connection Status
**Event:** `connection_status`

**Description:** Connection status updates.

**Payload:**
```json
{
  "status": "connected", // "connected", "disconnected", "reconnecting"
  "message": "Connected to server",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Example:**
```javascript
socket.on('connection_status', (data) => {
  console.log('Status:', data.status);
});
```

---

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE" // optional
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request (invalid parameters) |
| 404 | Not Found (resource doesn't exist) |
| 500 | Internal Server Error |
| 503 | Service Unavailable (Redis connection failed) |

### Error Response Format

**HTTP Error:**
```json
{
  "error": "Error message",
  "success": false
}
```

**WebSocket Error:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "event": "original_event_name"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_PARAMS` | Missing or invalid parameters |
| `NOT_FOUND` | Resource not found |
| `REDIS_ERROR` | Redis connection or operation failed |
| `BOT_ERROR` | AI bot service error |
| `TTS_ERROR` | Text-to-speech generation error |
| `VALIDATION_ERROR` | Input validation failed |

---

## Product Data Model

```typescript
interface Product {
  id: string;              // Unique product identifier (e.g., "prod-1")
  name: string;            // Product name
  description: string;     // Product description
  category: string;        // Product category (Electronics, Fashion, Books)
  price: number;          // Product price (decimal)
  rating: number;         // Product rating (0-5)
  stock: number;          // Available stock quantity
  brand: string;          // Product brand name (optional)
  image: string;          // Product image URL
}
```

---

## Example Usage

### REST API Example (JavaScript)

```javascript
// Search products
const response = await fetch('http://localhost:3006/api/products/search?q=laptop&category=Electronics&minPrice=500&maxPrice=2000');
const data = await response.json();
console.log('Products:', data.products);

// Get product by ID
const productResponse = await fetch('http://localhost:3006/api/products/prod-1');
const productData = await productResponse.json();
console.log('Product:', productData.product);
```

### WebSocket Example (JavaScript)

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3006');

// Join room
socket.emit('join_room', { roomId: 'room-123' });

// Listen for room joined
socket.on('room_joined', (data) => {
  console.log('Joined:', data.roomId);
});

// Send message to bot
socket.emit('send_message', {
  message: "I'm looking for a smartphone",
  roomId: 'room-123',
  includeAudio: true
});

// Listen for bot response
socket.on('bot_response', (data) => {
  console.log('Bot:', data.message);
  if (data.audio) {
    const audio = new Audio('data:audio/mpeg;base64,' + data.audio);
    audio.play();
  }
});

// Search products
socket.emit('search_products', {
  query: 'laptop',
  category: 'Electronics',
  minPrice: 500,
  maxPrice: 2000
});

// Listen for search results
socket.on('products_search_result', (data) => {
  console.log('Found products:', data.products);
});

// Handle errors
socket.on('error', (data) => {
  console.error('Error:', data.error);
});
```

---

## Notes

1. **WebSocket Implementation**: The WebSocket API contract is provided as a specification. The current implementation uses REST APIs only. To use WebSocket functionality, Socket.IO needs to be integrated into the server.

2. **Authentication**: Currently, no authentication is required. In production, consider adding authentication tokens.

3. **Rate Limiting**: Consider implementing rate limiting for both REST and WebSocket endpoints in production.

4. **CORS**: The server is configured to allow CORS from localhost. Adjust CORS settings for production.

5. **Redis Dependency**: Most endpoints require Redis to be running. If Redis is unavailable, endpoints return a 503 status.

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0
