# API Documentation

Complete API reference for the prototype backend.

## Base URL
```
http://localhost:3001
```

---

## AI Agent API

### 1. Chat with AI Agent

**Endpoint:** `POST /api/ai/chat`

**Description:** Send a message to the AI agent and get a response.

**Request Body:**
```json
{
  "message": "Hello, how are you?",
  "conversationId": "optional-conversation-id",
  "userId": "optional-user-id"
}
```

**Response:**
```json
{
  "success": true,
  "conversationId": "conv-1234567890-abc123",
  "response": "Hello! How can I assist you today?",
  "timestamp": "2024-01-22T15:00:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the weather today?"}'
```

---

### 2. Get Conversation History

**Endpoint:** `GET /api/ai/conversation/:conversationId`

**Description:** Retrieve all messages in a conversation.

**Response:**
```json
{
  "success": true,
  "conversationId": "conv-1234567890-abc123",
  "messages": [
    {
      "role": "user",
      "content": "Hello",
      "timestamp": "2024-01-22T15:00:00.000Z"
    },
    {
      "role": "assistant",
      "content": "Hello! How can I assist you?",
      "timestamp": "2024-01-22T15:00:01.000Z"
    }
  ],
  "count": 2
}
```

---

### 3. List All Conversations

**Endpoint:** `GET /api/ai/conversations`

**Description:** Get a list of all conversations.

**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "conversationId": "conv-1234567890-abc123",
      "messageCount": 5,
      "lastMessage": "2024-01-22T15:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

### 4. Delete Conversation

**Endpoint:** `DELETE /api/ai/conversation/:conversationId`

**Description:** Delete a conversation and its history.

**Response:**
```json
{
  "success": true,
  "message": "Conversation deleted"
}
```

---

## Database API

### 1. List Available Tables

**Endpoint:** `GET /api/db/tables/list`

**Description:** Get a list of all available database tables.

**Response:**
```json
{
  "success": true,
  "tables": [
    {
      "name": "users",
      "recordCount": 3,
      "sampleFields": ["id", "name", "email", "role"]
    },
    {
      "name": "products",
      "recordCount": 3,
      "sampleFields": ["id", "name", "price", "category"]
    }
  ],
  "total": 2
}
```

---

### 2. Get All Records

**Endpoint:** `GET /api/db/:table`

**Description:** Retrieve all records from a table with optional pagination and sorting.

**Query Parameters:**
- `limit` (optional): Number of records to return (default: all)
- `offset` (optional): Number of records to skip (default: 0)
- `sort` (optional): Field to sort by
- `order` (optional): Sort order - `asc` or `desc` (default: `asc`)

**Example:**
```
GET /api/db/users?limit=10&offset=0&sort=name&order=asc
```

**Response:**
```json
{
  "success": true,
  "table": "users",
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  ],
  "total": 3,
  "limit": 10,
  "offset": 0,
  "count": 3
}
```

---

### 3. Get Single Record

**Endpoint:** `GET /api/db/:table/:id`

**Description:** Retrieve a single record by ID.

**Example:**
```
GET /api/db/users/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2024-01-22T15:00:00.000Z"
  }
}
```

---

### 4. Create Record

**Endpoint:** `POST /api/db/:table`

**Description:** Create a new record in the specified table.

**Request Body:**
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "role": "user"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Record created",
  "data": {
    "id": 4,
    "name": "Alice",
    "email": "alice@example.com",
    "role": "user",
    "createdAt": "2024-01-22T15:00:00.000Z"
  }
}
```

---

### 5. Update Record

**Endpoint:** `PUT /api/db/:table/:id`

**Description:** Update an existing record.

**Request Body:**
```json
{
  "name": "Alice Updated",
  "role": "admin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Record updated",
  "data": {
    "id": 4,
    "name": "Alice Updated",
    "email": "alice@example.com",
    "role": "admin",
    "updatedAt": "2024-01-22T15:00:00.000Z"
  }
}
```

---

### 6. Delete Record

**Endpoint:** `DELETE /api/db/:table/:id`

**Description:** Delete a record by ID.

**Response:**
```json
{
  "success": true,
  "message": "Record deleted",
  "data": {
    "id": 4,
    "name": "Alice",
    "email": "alice@example.com"
  }
}
```

---

### 7. Search Records

**Endpoint:** `GET /api/db/:table/search`

**Description:** Search records by field values.

**Query Parameters:** Any field name with value to search for.

**Example:**
```
GET /api/db/products/search?category=electronics&price=29.99
```

**Response:**
```json
{
  "success": true,
  "table": "products",
  "query": {
    "category": "electronics",
    "price": "29.99"
  },
  "data": [
    {
      "id": 1,
      "name": "Product A",
      "price": 29.99,
      "category": "electronics"
    }
  ],
  "count": 1
}
```

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

---

## Example Workflows

### 1. Chat with AI and Retrieve History

```bash
# Start conversation
curl -X POST http://localhost:3001/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'

# Response includes conversationId: "conv-123..."

# Get conversation history
curl http://localhost:3001/api/ai/conversation/conv-123...
```

### 2. CRUD Operations on Users

```bash
# Create user
curl -X POST http://localhost:3001/api/db/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Bob", "email": "bob@example.com", "role": "user"}'

# Get all users
curl http://localhost:3001/api/db/users

# Get user by ID
curl http://localhost:3001/api/db/users/1

# Update user
curl -X PUT http://localhost:3001/api/db/users/1 \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'

# Delete user
curl -X DELETE http://localhost:3001/api/db/users/1
```

### 3. Search Products

```bash
# Search by category
curl "http://localhost:3001/api/db/products/search?category=electronics"

# Search by multiple fields
curl "http://localhost:3001/api/db/products/search?category=electronics&price=29.99"
```

---

## Notes

- **No Authentication**: All endpoints are open (prototype only)
- **In-Memory Storage**: Data is lost on server restart
- **CORS Enabled**: All origins allowed
- **Error Handling**: All errors return JSON with error details
