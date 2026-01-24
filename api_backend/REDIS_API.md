# Redis API Documentation

API endpoints for reading room data from Redis database.

## Redis Configuration

- **URL**: `redis://localhost:6379` (or from `REDIS_URL` env variable)
- **Database**: 3
- **Key Prefix**: `hackthon-13:`
- **Key Format**: `hackthon-13:room:room-123`
- **Value Format**: JSON string with `roomId`, `productCategory`, `createdAt`

## Endpoints

### 1. Get All Rooms

**Endpoint:** `GET /api/redis/rooms`

**Description:** Retrieve all rooms with their product categories from Redis.

**Response:**
```json
{
  "success": true,
  "rooms": [
    {
      "roomId": "room-123",
      "productCategory": "Electronics",
      "createdAt": "2024-01-22T15:00:00.000Z"
    },
    {
      "roomId": "room-456",
      "productCategory": "Clothing",
      "createdAt": "2024-01-22T16:00:00.000Z"
    }
  ],
  "count": 2
}
```

**Example:**
```bash
curl http://localhost:3001/api/redis/rooms
```

---

### 2. Get Room by ID

**Endpoint:** `GET /api/redis/room/:roomId`

**Description:** Get a specific room by its roomId.

**Response:**
```json
{
  "success": true,
  "room": {
    "roomId": "room-123",
    "productCategory": "Electronics",
    "createdAt": "2024-01-22T15:00:00.000Z"
  }
}
```

**Example:**
```bash
curl http://localhost:3001/api/redis/room/room-123
```

---

### 3. Get Rooms by Category

**Endpoint:** `GET /api/redis/rooms/category/:category`

**Description:** Get all rooms filtered by product category.

**Response:**
```json
{
  "success": true,
  "category": "Electronics",
  "rooms": [
    {
      "roomId": "room-123",
      "productCategory": "Electronics",
      "createdAt": "2024-01-22T15:00:00.000Z"
    }
  ],
  "count": 1
}
```

**Example:**
```bash
curl http://localhost:3001/api/redis/rooms/category/Electronics
```

---

### 4. Get All Categories

**Endpoint:** `GET /api/redis/categories`

**Description:** Get a list of all unique product categories.

**Response:**
```json
{
  "success": true,
  "categories": [
    "Clothing",
    "Electronics",
    "Books"
  ],
  "count": 3
}
```

**Example:**
```bash
curl http://localhost:3001/api/redis/categories
```

---

### 5. Create/Update Room (Testing)

**Endpoint:** `POST /api/redis/room`

**Description:** Create or update a room in Redis (for testing purposes).

**Request Body:**
```json
{
  "roomId": "room-123",
  "productCategory": "Electronics"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Room created/updated in Redis",
  "room": {
    "roomId": "room-123",
    "productCategory": "Electronics",
    "createdAt": "2024-01-22T15:00:00.000Z"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/redis/room \
  -H "Content-Type: application/json" \
  -d '{"roomId": "room-123", "productCategory": "Electronics"}'
```

---

### 6. Delete Room

**Endpoint:** `DELETE /api/redis/room/:roomId`

**Description:** Delete a room from Redis.

**Response:**
```json
{
  "success": true,
  "message": "Room room-123 deleted from Redis"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3001/api/redis/room/room-123
```

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "details": "Additional error details (if available)"
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

---

## Example Usage

### Get all rooms with product categories:
```bash
curl http://localhost:3001/api/redis/rooms
```

### Get specific room:
```bash
curl http://localhost:3001/api/redis/room/room-123
```

### Get rooms by category:
```bash
curl http://localhost:3001/api/redis/rooms/category/Electronics
```

### Get all categories:
```bash
curl http://localhost:3001/api/redis/categories
```

### Create test room:
```bash
curl -X POST http://localhost:3001/api/redis/room \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room-test-123",
    "productCategory": "Electronics"
  }'
```

---

## Notes

- **No Authentication**: All endpoints are open (prototype)
- **Redis Connection**: Automatically connects on first request
- **Key Prefix**: All keys are prefixed with `hackthon-13:`
- **Case Insensitive**: Category search is case-insensitive
- **Error Handling**: Graceful error handling with detailed messages

---

## Redis Key Structure

```
Key: hackthon-13:room:room-123
Value: {"roomId":"room-123","productCategory":"Electronics","createdAt":"2024-01-22T15:00:00.000Z"}
```

The API automatically handles the key prefix, so you only need to provide the roomId.
