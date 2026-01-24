import axios from 'axios';
import dotenv from 'dotenv';
import { createClient } from 'redis';

dotenv.config();

// Genvoy API Configuration
// Note: Use https://genvoy.flipkart.net for external access
// Use http://genvoy.jarvis-prod.fkcloud.in for internal network access
const GENVOY_BASE_URL = process.env.GENVOY_BASE_URL || 'https://genvoy.flipkart.net';
const MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';
const SUBSCRIPTION_KEY = process.env.GENVOY_SUBSCRIPTION_KEY || 'dasf78sdf8dsf8dsf6d7b9ecd';

// Check if using placeholder API key
const PLACEHOLDER_KEY = 'dasf78sdf8dsf8dsf6d7b9ecd';
const isUsingPlaceholderKey = SUBSCRIPTION_KEY === PLACEHOLDER_KEY;

if (isUsingPlaceholderKey) {
  console.warn('⚠️  WARNING: Using placeholder API key. Please set GENVOY_SUBSCRIPTION_KEY in your .env file!');
  console.warn('⚠️  The bot will use fallback responses until a valid API key is provided.');
}

// Redis client for accessing products
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379/3';
let redisClient = null;

// Initialize Redis client
async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: redisUrl,
      keyPrefix: 'hackthon-13:'
    });
    
    redisClient.on('error', (err) => {
      console.error('Bot Service Redis Client Error:', err);
    });

    try {
      await redisClient.connect();
      if (!redisUrl.includes('/3') && !redisUrl.includes('?db=3')) {
        await redisClient.select(3);
      }
      console.log('Bot Service: Redis connection established');
    } catch (error) {
      console.error('Bot Service: Failed to connect to Redis:', error);
      // Don't throw, allow the service to continue without Redis
    }
  } else if (!redisClient.isOpen) {
    // Try to reconnect if connection was lost
    try {
      await redisClient.connect();
      if (!redisUrl.includes('/3') && !redisUrl.includes('?db=3')) {
        await redisClient.select(3);
      }
      console.log('Bot Service: Redis reconnected');
    } catch (error) {
      console.error('Bot Service: Failed to reconnect to Redis:', error);
    }
  }
  return redisClient;
}

// Log configuration on startup
console.log('Bot Service Configuration:', {
  baseUrl: GENVOY_BASE_URL,
  modelName: MODEL_NAME,
  hasKey: !!SUBSCRIPTION_KEY,
  keyLength: SUBSCRIPTION_KEY?.length || 0,
  isPlaceholderKey: isUsingPlaceholderKey,
  keyPreview: SUBSCRIPTION_KEY ? `${SUBSCRIPTION_KEY.substring(0, 8)}...` : 'NOT SET'
});

if (!isUsingPlaceholderKey && SUBSCRIPTION_KEY) {
  console.log('✅ API Key loaded successfully from environment variables');
} else if (!SUBSCRIPTION_KEY) {
  console.error('❌ ERROR: GENVOY_SUBSCRIPTION_KEY is not set in environment variables');
} else {
  console.warn('⚠️  WARNING: Using placeholder API key. Please set GENVOY_SUBSCRIPTION_KEY in your .env file!');
}

// Store conversation history per room
const conversationHistory = new Map(); // roomId -> array of messages

/**
 * Get all products from Redis
 * @returns {Promise<Array>} - Array of products
 */
async function getAllProducts() {
  try {
    const client = await getRedisClient();
    if (!client || !client.isOpen) {
      console.warn('Redis not available, returning empty product list');
      return [];
    }

    const keys = await client.keys('product:*');
    const products = [];

    for (const key of keys) {
      try {
        const productDataStr = await client.get(key);
        if (productDataStr) {
          const productData = JSON.parse(productDataStr);
          products.push(productData);
        }
      } catch (err) {
        console.error(`Error parsing product data for ${key}:`, err);
      }
    }

    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

/**
 * Build product context string for system instruction (concise version)
 * @param {Array} products} - Array of products
 * @returns {string} - Formatted product context
 */
function buildProductContext(products) {
  if (!products || products.length === 0) {
    return 'No products are currently available in the catalog.';
  }

  // Group products by category
  const byCategory = {};
  products.forEach(product => {
    if (!byCategory[product.category]) {
      byCategory[product.category] = [];
    }
    byCategory[product.category].push(product);
  });

  // Build concise context - limit description length and use compact format
  let context = `\n\nPRODUCT CATALOG (${products.length} products):\n\n`;
  
  Object.entries(byCategory).forEach(([category, categoryProducts]) => {
    context += `${category} (${categoryProducts.length}):\n`;
    categoryProducts.forEach(product => {
      // Truncate description to 60 chars max
      const shortDesc = product.description.length > 60 
        ? product.description.substring(0, 57) + '...' 
        : product.description;
      
      context += `• ${product.name} - $${product.price.toFixed(2)}`;
      if (product.brand) {
        context += ` (${product.brand})`;
      }
      context += ` - ${shortDesc} - Rating: ${product.rating}/5\n`;
    });
    context += `\n`;
  });

  context += `\nIMPORTANT: Use exact product names, prices, and details from above. Help customers find products by category, price, brand, or features.`;

  return context;
}

/**
 * Call Gemini API via Genvoy
 * @param {string} text - User's text input
 * @param {string} roomId - Room ID for conversation context
 * @returns {Promise<string>} - Bot's text response
 */
export async function getBotResponse(text, roomId) {
  try {
    // Get all products to include in context
    const products = await getAllProducts();
    const productContext = buildProductContext(products);

    // Get or initialize conversation history for this room
    if (!conversationHistory.has(roomId)) {
      conversationHistory.set(roomId, []);
      
      // Add system instruction for Flipkart salesperson role with product context
      const systemInstruction = `You are a friendly and knowledgeable Flipkart salesperson working in the Flipkart Mall. Your role is to help customers discover and learn about products available on Flipkart.

IMPORTANT RULES:
1. You MUST ONLY discuss Flipkart products, their features, specifications, prices, and availability
2. You MUST act as a Flipkart salesperson showing customers around the Flipkart Mall
3. You MUST NOT answer questions about topics unrelated to Flipkart products (no general knowledge, news, weather, etc.)
4. You MUST redirect any non-product questions back to Flipkart products
5. You MUST be enthusiastic about Flipkart's product range and help customers find what they need
6. You MUST provide product details, specifications, features, and benefits when discussing products
7. You MUST mention that products are available on Flipkart platform
8. You have access to the complete product catalog and MUST use accurate product information from it
9. When customers ask about products, search through the catalog and provide specific product names, prices, and details
10. Help customers find products by category, price range, brand, or specific features
11. If a product is not in the catalog, politely let them know and suggest similar products from the catalog

${productContext}

If a customer asks about something unrelated to Flipkart products, politely redirect them by saying something like: "I'm here to help you with Flipkart products! Let me show you what we have in our mall. What kind of product are you looking for?"

Always maintain a helpful, professional, and enthusiastic tone as a Flipkart salesperson.`;

      conversationHistory.get(roomId).push({
        role: 'user',
        parts: [{ text: systemInstruction }]
      });
      
      // Add initial model response to establish the role
      conversationHistory.get(roomId).push({
        role: 'model',
        parts: [{ text: `Welcome to Flipkart Mall! I'm your personal shopping assistant. I have access to our complete product catalog with ${products.length} amazing products across ${Object.keys(products.reduce((acc, p) => { acc[p.category] = true; return acc; }, {})).length} categories. I'm here to help you discover products, compare options, and find exactly what you're looking for. What can I help you find today?` }]
      });
    }
    const history = conversationHistory.get(roomId);

    // Refresh product context periodically (every 5 messages) to ensure bot has latest data
    const shouldRefreshContext = history.length % 10 === 0;
    if (shouldRefreshContext) {
      const products = await getAllProducts();
      const productContext = buildProductContext(products);
      // Update system instruction in the first message
      if (history.length > 0 && history[0].role === 'user') {
        const originalInstruction = history[0].parts[0].text;
        const baseInstruction = originalInstruction.split('AVAILABLE PRODUCTS CATALOG:')[0];
        history[0].parts[0].text = baseInstruction + productContext;
      }
    }

    // Add user message to history
    history.push({
      role: 'user',
      parts: [{ text: text }]
    });

    // Get current products for system instruction (only on first message or every 10 messages)
    // Limit product context to avoid payload size issues
    let currentProductContext = '';
    const shouldIncludeFullContext = history.length <= 2 || history.length % 10 === 0;
    
    if (shouldIncludeFullContext) {
      const currentProducts = await getAllProducts();
      currentProductContext = buildProductContext(currentProducts);
    } else {
      // Use a shorter summary for subsequent messages
      const currentProducts = await getAllProducts();
      const categoryCounts = {};
      currentProducts.forEach(p => {
        categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
      });
      currentProductContext = `\n\nPRODUCT CATALOG SUMMARY: ${currentProducts.length} products across ${Object.keys(categoryCounts).length} categories (${Object.entries(categoryCounts).map(([cat, count]) => `${cat}: ${count}`).join(', ')}). You have access to all product details including names, prices, descriptions, brands, stock, and ratings.`;
    }

    // Prepare request payload according to Gemini API contract
    // Include system instruction to maintain Flipkart salesperson role with product context
    const systemInstructionText = `You are a Flipkart salesperson in Flipkart Mall. You MUST ONLY discuss Flipkart products, their features, specifications, prices, and availability. You MUST NOT answer questions about topics unrelated to Flipkart products. If asked about non-product topics, politely redirect to Flipkart products. Always be helpful, enthusiastic, and professional. Focus on helping customers discover and learn about Flipkart products.${currentProductContext}`;
    
    // Limit system instruction size to avoid API errors (max ~8000 chars)
    const maxSystemInstructionLength = 8000;
    const finalSystemInstruction = systemInstructionText.length > maxSystemInstructionLength
      ? systemInstructionText.substring(0, maxSystemInstructionLength - 100) + '... [Catalog truncated for API limits]'
      : systemInstructionText;

    const requestPayload = {
      contents: history,
      systemInstruction: {
        parts: [{ text: finalSystemInstruction }]
      },
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.6, // Slightly lower for more focused responses
        topP: 0.8,
        topK: 40,
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

    // Make API call to Genvoy
    const endpoint = `${GENVOY_BASE_URL}/${MODEL_NAME}/:generateContent`;
    
    const payloadSize = JSON.stringify(requestPayload).length;
    console.log('Calling Gemini API:', {
      endpoint,
      modelName: MODEL_NAME,
      hasSubscriptionKey: !!SUBSCRIPTION_KEY,
      subscriptionKeyLength: SUBSCRIPTION_KEY?.length,
      isPlaceholderKey: isUsingPlaceholderKey,
      payloadSize: payloadSize,
      systemInstructionLength: finalSystemInstruction.length,
      historyLength: history.length
    });

    // Warn if using placeholder key
    if (isUsingPlaceholderKey) {
      console.warn('⚠️  Using placeholder API key - API call will likely fail. Using fallback response instead.');
      throw new Error('Invalid API key: Please set GENVOY_SUBSCRIPTION_KEY in your .env file');
    }

    // Warn if payload is too large
    if (payloadSize > 100000) {
      console.warn('Warning: Large payload size:', payloadSize, 'bytes');
    }
    
    const response = await axios.post(endpoint, requestPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY
      },
      timeout: 30000, // 30 seconds timeout
      validateStatus: function (status) {
        return status < 500; // Don't throw for 4xx errors, we'll handle them
      }
    });

    // Check for error status
    if (response.status >= 400) {
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        endpoint: endpoint,
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY ? `${SUBSCRIPTION_KEY.substring(0, 8)}...` : 'MISSING'
        }
      });
      
      // Provide more helpful error messages
      let errorMsg = response.data?.error?.message || 
                     response.data?.message || 
                     response.data?.error ||
                     `HTTP ${response.status}: ${response.statusText}`;
      
      if (response.status === 401 || response.status === 403) {
        errorMsg = `Authentication failed. Please check your GENVOY_SUBSCRIPTION_KEY. ${errorMsg}`;
      } else if (response.status === 404) {
        errorMsg = `Endpoint not found. Please verify GENVOY_BASE_URL and GEMINI_MODEL_NAME. ${errorMsg}`;
      } else if (response.status === 500) {
        errorMsg = `Server error from Genvoy API. This might be a temporary issue. ${errorMsg}`;
      }
      
      throw new Error(`Gemini API Error: ${errorMsg}`);
    }

    // Extract response text
    if (response.data && response.data.candidates && response.data.candidates.length > 0) {
      const candidate = response.data.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const responseText = candidate.content.parts[0].text;
        
        // Add bot response to history
        history.push({
          role: 'model',
          parts: [{ text: responseText }]
        });

        // Keep conversation history but preserve system instruction
        // Keep last 8 user-model exchanges (16 messages) plus system instruction (2 messages) = 18 total
        // But we want to keep system instruction always, so keep those + last 14 messages
        if (history.length > 18) {
          // Keep first 2 messages (system instruction) and last 16 messages
          const systemInstruction = history.slice(0, 2);
          const recentMessages = history.slice(-16);
          history.length = 0;
          history.push(...systemInstruction, ...recentMessages);
        }

        console.log('Bot response received successfully');
        return responseText;
      }
    }

    console.error('Invalid response format:', response.data);
    throw new Error('Invalid response format from Gemini API');
  } catch (error) {
    console.error('Error calling Gemini API:', {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : null,
      request: error.request ? 'Request made but no response' : null
    });
    
    if (error.response) {
      // API returned error response
      const errorMsg = error.response.data?.error?.message || 
                      error.response.data?.message || 
                      error.response.data?.error ||
                      `HTTP ${error.response.status}: ${error.response.statusText}`;
      throw new Error(`Gemini API Error: ${errorMsg}`);
    } else if (error.request) {
      // Request made but no response
      throw new Error('No response from Gemini API. Please check your connection and ensure the Genvoy service is accessible.');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Connection refused. Please check if the Genvoy service is running and accessible.');
    } else if (error.code === 'ENOTFOUND') {
      throw new Error('DNS lookup failed. Please check the GENVOY_BASE_URL in your environment variables.');
    } else {
      // Error in request setup
      throw new Error(`Request error: ${error.message}`);
    }
  }
}

/**
 * Get a fallback response when API fails (exported for use in server)
 * @param {string} userMessage - User's message
 * @param {string} roomId - Room ID
 * @returns {Promise<string>} - Fallback response
 */
export async function getFallbackResponse(userMessage, roomId) {
  try {
    const products = await getAllProducts();
    const lowerMessage = userMessage.toLowerCase();
    
    // Simple keyword-based fallback responses
    if (lowerMessage.includes('smartphone') || lowerMessage.includes('phone') || lowerMessage.includes('iphone')) {
      const phones = products.filter(p => p.category === 'Electronics' && 
        (p.name.toLowerCase().includes('phone') || p.name.toLowerCase().includes('iphone')));
      if (phones.length > 0) {
        const phone = phones[0];
        return `I found ${phone.name} for $${phone.price.toFixed(2)}. ${phone.description}. It has a rating of ${phone.rating}/5 and ${phone.stock} units in stock. Would you like to know more about this or other smartphones?`;
      }
    }
    
    if (lowerMessage.includes('laptop') || lowerMessage.includes('computer')) {
      const laptops = products.filter(p => p.category === 'Electronics' && 
        p.name.toLowerCase().includes('laptop'));
      if (laptops.length > 0) {
        const laptop = laptops[0];
        return `I found ${laptop.name} for $${laptop.price.toFixed(2)}. ${laptop.description}. It has a rating of ${laptop.rating}/5. Would you like to see more laptop options?`;
      }
    }
    
    if (lowerMessage.includes('book') || lowerMessage.includes('read')) {
      const books = products.filter(p => p.category === 'Books');
      if (books.length > 0) {
        const book = books[Math.floor(Math.random() * books.length)];
        return `I found "${book.name}" for $${book.price.toFixed(2)}. ${book.description}. It has a rating of ${book.rating}/5. We have ${books.length} books in our catalog. Would you like to see more?`;
      }
    }
    
    if (lowerMessage.includes('fashion') || lowerMessage.includes('clothing') || lowerMessage.includes('shoes')) {
      const fashion = products.filter(p => p.category === 'Fashion');
      if (fashion.length > 0) {
        const item = fashion[Math.floor(Math.random() * fashion.length)];
        return `I found ${item.name} for $${item.price.toFixed(2)}. ${item.description}. We have ${fashion.length} fashion items available. Would you like to see more options?`;
      }
    }
    
    // Generic fallback
    const totalProducts = products.length;
    const categories = [...new Set(products.map(p => p.category))];
    return `I'm here to help you find products on Flipkart! We have ${totalProducts} products across ${categories.length} categories: ${categories.join(', ')}. What specific product are you looking for? You can ask about smartphones, laptops, books, fashion items, or any other products in our catalog.`;
  } catch (error) {
    console.error('Error generating fallback response:', error);
    return `I'm having trouble connecting right now, but I'm here to help you find products on Flipkart! We have a wide range of Electronics, Fashion, and Books. What are you looking for?`;
  }
}

/**
 * Clear conversation history for a room
 * @param {string} roomId - Room ID
 */
export function clearConversationHistory(roomId) {
  conversationHistory.delete(roomId);
  console.log(`Conversation history cleared for room: ${roomId}`);
}

/**
 * Get conversation history for a room
 * @param {string} roomId - Room ID
 * @returns {Array} - Conversation history
 */
export function getConversationHistory(roomId) {
  return conversationHistory.get(roomId) || [];
}
