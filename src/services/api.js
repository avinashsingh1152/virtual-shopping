// API service for fetching categories and rooms
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3004'
// Image generation API uses port 3001
const IMAGE_API_BASE_URL = import.meta.env.VITE_IMAGE_API_BASE_URL || 'http://localhost:3001'
// Gemini API for product generation uses port 3001
const GEMINI_API_BASE_URL = import.meta.env.VITE_GEMINI_API_BASE_URL || 'http://localhost:3001'
// Redis API uses port 3001
const REDIS_API_BASE_URL = import.meta.env.VITE_REDIS_API_BASE_URL || 'http://localhost:3001'

/**
 * Fetch all categories from the API (now using /api/rooms endpoint)
 * @returns {Promise<{categories: string[], count: number}>}
 */
export async function fetchCategories() {
  const url = `${API_BASE_URL}/api/rooms`
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`)
    }
    const data = await response.json()
    // Extract unique categories from rooms if needed
    // If API returns categories directly, use that, otherwise extract from rooms
    if (data.categories) {
      return data
    } else if (data.rooms && Array.isArray(data.rooms)) {
      // Extract unique categories from rooms
      const categories = [...new Set(data.rooms.map(room => room.productCategory || room.category).filter(Boolean))]
      return { categories, count: categories.length }
    }
    return { categories: [], count: 0 }
  } catch (error) {
    console.error('Error fetching categories:', error)
    // Return empty data on error
    return { categories: [], count: 0 }
  }
}

/**
 * Fetch rooms for a specific category
 * @param {string} category - The category name
 * @returns {Promise<{category: string, rooms: Array, count: number}>}
 * Rooms should include: { roomId, productCategory, createdAt, creatorId }
 */
export async function fetchRoomsByCategory(category) {
  const url = `${API_BASE_URL}/api/rooms/${encodeURIComponent(category)}`
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch rooms for ${category}: ${response.status} ${response.statusText}`)
    }
    const data = await response.json()
    
    // Ensure rooms have creatorId (default to roomId if not provided)
    // Handle different response formats
    let rooms = []
    if (data.rooms && Array.isArray(data.rooms)) {
      rooms = data.rooms
    } else if (Array.isArray(data)) {
      rooms = data
    }
    
    rooms = rooms.map(room => ({
      ...room,
      creatorId: room.creatorId || room.createdBy || room.roomId // Fallback to roomId
    }))
    
    return {
      category,
      rooms,
      count: rooms.length
    }
  } catch (error) {
    console.error(`Error fetching rooms for category ${category}:`, error)
    // Return empty data on error
    return { category, rooms: [], count: 0 }
  }
}

/**
 * Fetch number of live chats available
 * @returns {Promise<number>} Number of live chats
 */
export async function fetchLiveChatCount() {
  const url = `${API_BASE_URL}/api/livechats/count`
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      // If endpoint doesn't exist, return default
      return 4 // Default: one for each wall
    }
    const data = await response.json()
    return data.count || 4
  } catch (error) {
    // Return default count on error
    return 4 // Default: one for each wall
  }
}

/**
 * Check room status - whether the room is active and channel is available
 * @param {string} roomId - Room ID to check
 * @returns {Promise<{roomId: string, isActive: boolean, channelActive: boolean}>}
 */
export async function checkRoomStatus(roomId) {
  const url = `${API_BASE_URL}/api/rooms/${encodeURIComponent(roomId)}/status`
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      // If endpoint doesn't exist, assume room is active for backward compatibility
      return { roomId, isActive: true, channelActive: true }
    }
    const data = await response.json()
    
    return {
      roomId,
      isActive: data.isActive !== false, // Default to true if not specified
      channelActive: data.channelActive !== false, // Default to true if not specified
    }
  } catch (error) {
    // On error, assume room is active (backward compatibility)
    return { roomId, isActive: true, channelActive: true }
  }
}

/**
 * Generate a single product image
 * @param {string} category - The category name
 * @param {string} description - Optional description
 * @returns {Promise<{success: boolean, category: string, imagePath: string}>}
 */
export async function generateProductImage(category, description = null) {
  const url = `${IMAGE_API_BASE_URL}/api/products/generate-image`
  
  try {
    const body = { category }
    if (description) {
      body.description = description
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to generate image: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    // Convert relative path to full URL
    const imageUrl = data.imagePath?.startsWith('http') 
      ? data.imagePath 
      : `${IMAGE_API_BASE_URL}${data.imagePath}`
    
    return {
      ...data,
      imageUrl,
    }
  } catch (error) {
    console.error(`Error generating image for ${category}:`, error)
    throw error
  }
}

/**
 * Generate multiple product images
 * @param {string[]} categories - Array of category names
 * @returns {Promise<Array<{success: boolean, category: string, imagePath?: string, imageUrl?: string}>>}
 */
export async function generateProductImages(categories) {
  const url = `${IMAGE_API_BASE_URL}/api/products/generate-images`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ categories }),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to generate images: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    // Convert relative paths to full URLs
    return data.map(item => ({
      ...item,
      imageUrl: item.imagePath?.startsWith('http')
        ? item.imagePath
        : item.imagePath ? `${IMAGE_API_BASE_URL}${item.imagePath}` : null,
    }))
  } catch (error) {
    console.error('Error generating images:', error)
    throw error
  }
}

/**
 * Get all product images organized by category
 * @returns {Promise<{success: boolean, images: Object, categories: string[]}>}
 */
export async function getAllProductImages() {
  const url = `${IMAGE_API_BASE_URL}/api/products/images`
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch images: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    // Convert relative paths to full URLs
    if (data.images) {
      const convertedImages = {}
      for (const [category, images] of Object.entries(data.images)) {
        convertedImages[category] = images.map(img => ({
          ...img,
          imageUrl: img.imagePath?.startsWith('http')
            ? img.imagePath
            : img.imagePath ? `${IMAGE_API_BASE_URL}${img.imagePath}` : null,
        }))
      }
      data.images = convertedImages
    }
    
    return data
  } catch (error) {
    console.error('Error fetching all images:', error)
    throw error
  }
}

/**
 * Get images for a specific category
 * @param {string} category - The category name
 * @returns {Promise<{success: boolean, category: string, images: Array}>}
 */
export async function getProductImagesByCategory(category) {
  const url = `${IMAGE_API_BASE_URL}/api/products/images/${encodeURIComponent(category)}`
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch images for ${category}: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    // Convert relative paths to full URLs
    if (data.images) {
      data.images = data.images.map(img => ({
        ...img,
        imageUrl: img.imagePath?.startsWith('http')
          ? img.imagePath
          : img.imagePath ? `${IMAGE_API_BASE_URL}${img.imagePath}` : null,
      }))
    }
    
    return data
  } catch (error) {
    console.error(`Error fetching images for category ${category}:`, error)
    throw error
  }
}


/**
 * Generate products for a category using Gemini API
 * @param {string} category - The category name
 * @param {number} count - Number of products to generate
 * @returns {Promise<{success: boolean, category: string, products: Array}>}
 */
export async function generateProductsWithGemini(category, count = 3) {
  const url = `${GEMINI_API_BASE_URL}/api/gemini/products/generate`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        category,
        count 
      }),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to generate products: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Error generating products for ${category}:`, error)
    throw error
  }
}

/**
 * Get all rooms from Redis
 * @returns {Promise<{success: boolean, rooms: Array, count: number}>}
 */
export async function getAllRoomsFromRedis() {
  const url = `${REDIS_API_BASE_URL}/api/redis/rooms`
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch rooms: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching rooms from Redis:', error)
    throw error
  }
}

/**
 * Get room by ID from Redis
 * @param {string} roomId - The room ID
 * @returns {Promise<{success: boolean, room: Object}>}
 */
export async function getRoomByIdFromRedis(roomId) {
  const url = `${REDIS_API_BASE_URL}/api/redis/room/${encodeURIComponent(roomId)}`
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, room: null }
      }
      throw new Error(`Failed to fetch room: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Error fetching room ${roomId} from Redis:`, error)
    throw error
  }
}

/**
 * Get rooms by category from Redis
 * @param {string} category - The category name
 * @returns {Promise<{success: boolean, category: string, rooms: Array, count: number}>}
 */
export async function getRoomsByCategoryFromRedis(category) {
  const url = `${REDIS_API_BASE_URL}/api/redis/rooms/category/${encodeURIComponent(category)}`
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch rooms by category: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Error fetching rooms for category ${category} from Redis:`, error)
    throw error
  }
}

/**
 * Fetch products from products API
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Number of products per page (default: 100)
 * @param {string} options.sortBy - Field to sort by (default: 'price')
 * @param {string} options.order - Sort order: 'asc' or 'desc' (default: 'desc')
 * @returns {Promise<{products: Array, total: number, page: number, limit: number}>}
 */
export async function fetchProducts(options = {}) {
  const PRODUCTS_API_BASE_URL = import.meta.env.VITE_PRODUCTS_API_BASE_URL || 'http://localhost:3006'
  
  const {
    page = 1,
    limit = 100,
    sortBy = 'price',
    order = 'desc'
  } = options

  const url = new URL(`${PRODUCTS_API_BASE_URL}/api/products`)
  url.searchParams.append('page', page.toString())
  url.searchParams.append('limit', limit.toString())
  url.searchParams.append('sortBy', sortBy)
  url.searchParams.append('order', order)

  try {
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching products:', error)
    throw error
  }
}
