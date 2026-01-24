# Flipkart Product API

A comprehensive product API with AI-powered shopping assistant integration.

## Features

- 🛍️ **50 Sample Products** across Electronics, Fashion, and Books categories
- 🔍 **Advanced Search** with filters (category, price range, brand)
- 🤖 **AI Shopping Assistant** powered by Gemini via Genvoy API
- 💬 **Conversation Management** with room-based chat history
- 🎨 **Modern Web UI** for testing and demonstration

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   PRODUCT_API_PORT=3004
   REDIS_URL=redis://localhost:6379/3
   GENVOY_BASE_URL=https://genvoy.flipkart.net
   GEMINI_MODEL_NAME=gemini-2.5-flash
   GENVOY_SUBSCRIPTION_KEY=your-actual-api-key-here
   ```
   
   **⚠️ IMPORTANT: API Key Required**
   - You **MUST** provide a valid `GENVOY_SUBSCRIPTION_KEY` in your `.env` file
   - The default placeholder key will NOT work with the Gemini API
   - Without a valid key, the bot will use fallback responses (still functional but limited)
   - Get your API key from your Genvoy service administrator or https://genvoy.flipkart.net

3. **Start Redis** (if not already running)
   ```bash
   redis-server
   ```

4. **Initialize Products** (optional - products auto-load on server start)
   ```bash
   npm run init-products
   ```

5. **Start the Server**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

## Access the Web UI

Once the server is running, open your browser and navigate to:
```
http://localhost:3004/
```

## API Endpoints

### Products

- `GET /api/products` - Get all products (with pagination)
- `GET /api/products/search?q=query&category=Electronics&minPrice=100&maxPrice=500` - Search products
- `GET /api/products/category/:category` - Get products by category
- `GET /api/products/:productId` - Get product by ID
- `GET /api/products/categories/list` - Get all categories with counts

### AI Bot

- `POST /api/bot/chat` - Chat with AI bot
  ```json
  {
    "message": "I'm looking for a smartphone",
    "roomId": "room-123"
  }
  ```
- `GET /api/bot/chat/:roomId/history` - Get conversation history
- `DELETE /api/bot/chat/:roomId` - Clear conversation history

## Web UI Features

### Product Browser
- View all 50 products in a responsive grid
- Search products by name, description, or brand
- Filter by category (Electronics, Fashion, Books)
- View product details (price, rating, stock, brand)
- Real-time product statistics

### AI Chat Assistant
- Interactive chat interface
- Room-based conversation management
- Product-aware responses
- Clear chat history functionality
- Real-time message display

## Product Categories

- **Electronics** (20 products): Smartphones, laptops, headphones, gaming consoles, etc.
- **Fashion** (15 products): Clothing, shoes, accessories, etc.
- **Books** (15 products): Fiction, technical books, classics, etc.

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: Redis
- **AI**: Gemini 2.5 Flash via Genvoy API
- **Frontend**: Vanilla HTML/CSS/JavaScript

## Notes

- Products are automatically loaded into Redis on server startup
- The AI bot has access to all product information
- Conversation history is maintained per room ID
- All product images are from Unsplash (placeholder URLs)
