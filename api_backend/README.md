# API Backend - Prototype

Node.js API backend with AI agent and database retrieval endpoints. **No authentication/authorization** - prototype only.

## Features

- 🤖 **AI Agent API** - Chat with AI agent, conversation management
- 💾 **Database API** - CRUD operations, search, query
- 🚀 **RESTful API** - Standard HTTP endpoints
- 📝 **No Auth** - Open access for prototype development

## Installation

```bash
cd api_backend
npm install
```

## Running the Server

### Development Mode:
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

Server runs on **http://localhost:3001** (or port specified in `.env`)

## API Endpoints

### Health Check
```
GET /health
```

### Redis API (Room & Product Category)

#### Get All Rooms
```
GET /api/redis/rooms
```

#### Get Room by ID
```
GET /api/redis/room/:roomId
```

#### Get Rooms by Category
```
GET /api/redis/rooms/category/:category
```

#### Get All Categories
```
GET /api/redis/categories
```

#### Create/Update Room (Testing)
```
POST /api/redis/room
Body: { "roomId": "room-123", "productCategory": "Electronics" }
```

#### Delete Room
```
DELETE /api/redis/room/:roomId
```

#### Clear All Redis Data
```
DELETE /api/redis/clear
```
Deletes all room data from Redis (useful for testing/cleanup).

See [REDIS_API.md](./REDIS_API.md) for complete Redis API documentation.

### AI Agent API

#### Chat with AI
```
POST /api/ai/chat
Body: {
  "message": "Hello, how are you?",
  "conversationId": "optional-conversation-id",
  "userId": "optional-user-id"
}
```

#### Get Conversation History
```
GET /api/ai/conversation/:conversationId
```

#### List All Conversations
```
GET /api/ai/conversations
```

#### Delete Conversation
```
DELETE /api/ai/conversation/:conversationId
```

### Database API

#### List Available Tables
```
GET /api/db/tables/list
```

#### Get All Records from Table
```
GET /api/db/:table
Query params: ?limit=10&offset=0&sort=name&order=asc
```

#### Get Single Record
```
GET /api/db/:table/:id
```

#### Create Record
```
POST /api/db/:table
Body: { "name": "New Record", ... }
```

#### Update Record
```
PUT /api/db/:table/:id
Body: { "name": "Updated Name", ... }
```

#### Delete Record
```
DELETE /api/db/:table/:id
```

#### Search Records
```
GET /api/db/:table/search?field=value
```

## Available Tables (Prototype Data)

- `users` - User records
- `products` - Product catalog
- `orders` - Order records

## Example Usage

### Get Rooms from Redis
```bash
# Get all rooms with product categories
curl http://localhost:3001/api/redis/rooms

# Get specific room
curl http://localhost:3001/api/redis/room/room-123

# Get rooms by category
curl http://localhost:3001/api/redis/rooms/category/Electronics

# Get all categories
curl http://localhost:3001/api/redis/categories
```

### Chat with AI Agent
```bash
curl -X POST http://localhost:3001/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, what can you do?"}'
```

### Get All Users
```bash
curl http://localhost:3001/api/db/users
```

### Get Single User
```bash
curl http://localhost:3001/api/db/users/1
```

### Create New User
```bash
curl -X POST http://localhost:3001/api/db/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com", "role": "user"}'
```

### Search Products
```bash
curl "http://localhost:3001/api/db/products/search?category=electronics"
```

## Project Structure

```
api_backend/
├── src/
│   ├── server.js          # Main server file
│   └── routes/
│       ├── aiAgent.js     # AI agent routes
│       └── database.js    # Database routes
├── package.json
├── .env.example
└── README.md
```

## Integration Notes

### AI Agent
Currently uses a simple rule-based response system. To integrate with real AI:

1. **OpenAI**: Add `openai` package and configure API key
2. **Anthropic**: Add `@anthropic-ai/sdk` package
3. **Custom AI**: Replace `generateAIResponse()` function

### Database
Currently uses in-memory storage. To integrate with real database:

1. **MongoDB**: Add `mongodb` or `mongoose` package
2. **PostgreSQL**: Add `pg` package
3. **MySQL**: Add `mysql2` package
4. Replace in-memory `database` object with actual DB calls

## Development

- No authentication/authorization (prototype)
- CORS enabled for all origins
- Error handling with detailed messages
- Request logging for debugging

## Production Considerations

⚠️ **This is a prototype!** Before production:

1. Add authentication/authorization
2. Add rate limiting
3. Replace in-memory storage with real database
4. Integrate with actual AI service
5. Add input validation
6. Add error monitoring
7. Configure CORS properly
8. Add API documentation (Swagger/OpenAPI)

## License

MIT
