# Redis API Contract

Complete API documentation for Redis room and product category management endpoints.

**Base URL:** `http://localhost:3001/api/redis`  
**Content-Type:** `application/json`

---

## Table of Contents

1. [Get All Rooms](#1-get-all-rooms)
2. [Get Room by ID](#2-get-room-by-id)
3. [Get Rooms by Category](#3-get-rooms-by-category)
4. [Get All Categories](#4-get-all-categories)
5. [Create/Update Room](#5-createupdate-room)
6. [Delete Room](#6-delete-room)
7. [Clear All Rooms](#7-clear-all-rooms)

---

## 1. Get All Rooms

Retrieve all rooms with their product categories from Redis.

### Endpoint
```
GET /api/redis/rooms
```

### URL
```
http://localhost:3001/api/redis/rooms
```

### Request
- **Method:** `GET`
- **Headers:** None required
- **Query Parameters:** None
- **Request Body:** None

### Response

#### Success Response (200 OK)
```json
{
  "success": true,
  "rooms": [
    {
      "roomId": "room-123",
      "productCategory": "Electronics",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "roomId": "room-456",
      "productCategory": "Clothing",
      "createdAt": "2024-01-15T11:00:00.000Z"
    }
  ],
  "count": 2
}
```

#### Empty Response (200 OK)
```json
{
  "success": true,
  "message": "No rooms found",
  "rooms": [],
  "count": 0
}
```

#### Error Response (500 Internal Server Error)
```json
{
  "error": "Internal Server Error",
  "message": "Failed to retrieve rooms from Redis",
  "details": "Connection timeout"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Indicates if the request was successful |
| `rooms` | array | Array of room objects |
| `rooms[].roomId` | string | Unique room identifier |
| `rooms[].productCategory` | string | Product category associated with the room |
| `rooms[].createdAt` | string | ISO 8601 timestamp of room creation |
| `count` | number | Total number of rooms |

---

## 2. Get Room by ID

Retrieve a specific room by its room ID.

### Endpoint
```
GET /api/redis/room/:roomId
```

### URL
```
http://localhost:3001/api/redis/room/{roomId}
```

### Request
- **Method:** `GET`
- **Headers:** None required
- **Path Parameters:**
  - `roomId` (string, required) - The unique identifier of the room
- **Query Parameters:** None
- **Request Body:** None

### Response

#### Success Response (200 OK)
```json
{
  "success": true,
  "room": {
    "roomId": "room-123",
    "productCategory": "Electronics",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Not Found Response (404 Not Found)
```json
{
  "error": "Not Found",
  "message": "Room room-123 not found in Redis"
}
```

#### Error Response (500 Internal Server Error)
```json
{
  "error": "Internal Server Error",
  "message": "Failed to retrieve room from Redis",
  "details": "Connection timeout"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Indicates if the request was successful |
| `room` | object | Room object |
| `room.roomId` | string | Unique room identifier |
| `room.productCategory` | string | Product category associated with the room |
| `room.createdAt` | string | ISO 8601 timestamp of room creation |

### Example

**Request:**
```bash
curl http://localhost:3001/api/redis/room/room-123
```

**Response:**
```json
{
  "success": true,
  "room": {
    "roomId": "room-123",
    "productCategory": "Electronics",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 3. Get Rooms by Category

Retrieve all rooms that belong to a specific product category.

### Endpoint
```
GET /api/redis/rooms/category/:category
```

### URL
```
http://localhost:3001/api/redis/rooms/category/{category}
```

### Request
- **Method:** `GET`
- **Headers:** None required
- **Path Parameters:**
  - `category` (string, required) - Product category name (case-insensitive)
- **Query Parameters:** None
- **Request Body:** None

### Response

#### Success Response (200 OK)
```json
{
  "success": true,
  "category": "Electronics",
  "rooms": [
    {
      "roomId": "room-123",
      "productCategory": "Electronics",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "roomId": "room-789",
      "productCategory": "Electronics",
      "createdAt": "2024-01-15T12:00:00.000Z"
    }
  ],
  "count": 2
}
```

#### Empty Response (200 OK)
```json
{
  "success": true,
  "category": "Electronics",
  "rooms": [],
  "count": 0
}
```

#### Error Response (500 Internal Server Error)
```json
{
  "error": "Internal Server Error",
  "message": "Failed to retrieve rooms by category",
  "details": "Connection timeout"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Indicates if the request was successful |
| `category` | string | The category that was queried |
| `rooms` | array | Array of room objects matching the category |
| `rooms[].roomId` | string | Unique room identifier |
| `rooms[].productCategory` | string | Product category associated with the room |
| `rooms[].createdAt` | string | ISO 8601 timestamp of room creation |
| `count` | number | Total number of rooms in this category |

### Example

**Request:**
```bash
curl http://localhost:3001/api/redis/rooms/category/Electronics
```

**Response:**
```json
{
  "success": true,
  "category": "Electronics",
  "rooms": [
    {
      "roomId": "room-123",
      "productCategory": "Electronics",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

---

## 4. Get All Categories

Retrieve all unique product categories from all rooms in Redis.

### Endpoint
```
GET /api/redis/categories
```

### URL
```
http://localhost:3001/api/redis/categories
```

### Request
- **Method:** `GET`
- **Headers:** None required
- **Query Parameters:** None
- **Request Body:** None

### Response

#### Success Response (200 OK)
```json
{
  "success": true,
  "categories": [
    "Clothing",
    "Electronics",
    "Home & Kitchen",
    "Sports"
  ],
  "count": 4
}
```

#### Empty Response (200 OK)
```json
{
  "success": true,
  "categories": [],
  "count": 0
}
```

#### Error Response (500 Internal Server Error)
```json
{
  "error": "Internal Server Error",
  "message": "Failed to retrieve categories",
  "details": "Connection timeout"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Indicates if the request was successful |
| `categories` | array | Array of unique category names (sorted alphabetically) |
| `count` | number | Total number of unique categories |

### Example

**Request:**
```bash
curl http://localhost:3001/api/redis/categories
```

**Response:**
```json
{
  "success": true,
  "categories": [
    "Clothing",
    "Electronics",
    "Home & Kitchen"
  ],
  "count": 3
}
```

---

## 5. Create/Update Room

Create a new room or update an existing room in Redis.

### Endpoint
```
POST /api/redis/room
```

### URL
```
http://localhost:3001/api/redis/room
```

### Request
- **Method:** `POST`
- **Headers:**
  - `Content-Type: application/json`
- **Query Parameters:** None
- **Request Body:**
```json
{
  "roomId": "room-123",
  "productCategory": "Electronics"
}
```

### Request Body Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `roomId` | string | Yes | Unique room identifier |
| `productCategory` | string | Yes | Product category name |

### Response

#### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Room created/updated in Redis",
  "room": {
    "roomId": "room-123",
    "productCategory": "Electronics",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Bad Request Response (400 Bad Request)
```json
{
  "error": "Bad Request",
  "message": "roomId and productCategory are required"
}
```

#### Error Response (500 Internal Server Error)
```json
{
  "error": "Internal Server Error",
  "message": "Failed to create/update room in Redis",
  "details": "Connection timeout"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Indicates if the request was successful |
| `message` | string | Success message |
| `room` | object | Created/updated room object |
| `room.roomId` | string | Unique room identifier |
| `room.productCategory` | string | Product category associated with the room |
| `room.createdAt` | string | ISO 8601 timestamp of room creation |

### Example

**Request:**
```bash
curl -X POST http://localhost:3001/api/redis/room \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room-123",
    "productCategory": "Electronics"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Room created/updated in Redis",
  "room": {
    "roomId": "room-123",
    "productCategory": "Electronics",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 6. Delete Room

Delete a specific room from Redis by room ID.

### Endpoint
```
DELETE /api/redis/room/:roomId
```

### URL
```
http://localhost:3001/api/redis/room/{roomId}
```

### Request
- **Method:** `DELETE`
- **Headers:** None required
- **Path Parameters:**
  - `roomId` (string, required) - The unique identifier of the room to delete
- **Query Parameters:** None
- **Request Body:** None

### Response

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Room room-123 deleted from Redis"
}
```

#### Not Found Response (404 Not Found)
```json
{
  "error": "Not Found",
  "message": "Room room-123 not found in Redis"
}
```

#### Error Response (500 Internal Server Error)
```json
{
  "error": "Internal Server Error",
  "message": "Failed to delete room from Redis",
  "details": "Connection timeout"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Indicates if the request was successful |
| `message` | string | Success message with room ID |

### Example

**Request:**
```bash
curl -X DELETE http://localhost:3001/api/redis/room/room-123
```

**Response:**
```json
{
  "success": true,
  "message": "Room room-123 deleted from Redis"
}
```

---

## 7. Clear All Rooms

Delete all room data from Redis (useful for testing/cleanup).

### Endpoint
```
DELETE /api/redis/clear
```

### URL
```
http://localhost:3001/api/redis/clear
```

### Request
- **Method:** `DELETE`
- **Headers:** None required
- **Query Parameters:** None
- **Request Body:** None

### Response

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Deleted 5 room(s) from Redis",
  "deletedCount": 5
}
```

#### Empty Response (200 OK)
```json
{
  "success": true,
  "message": "No data to delete. Redis is already empty.",
  "deletedCount": 0
}
```

#### Error Response (500 Internal Server Error)
```json
{
  "error": "Internal Server Error",
  "message": "Failed to clear Redis data",
  "details": "Connection timeout"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Indicates if the request was successful |
| `message` | string | Success message with deletion count |
| `deletedCount` | number | Number of rooms deleted |

### Example

**Request:**
```bash
curl -X DELETE http://localhost:3001/api/redis/clear
```

**Response:**
```json
{
  "success": true,
  "message": "Deleted 5 room(s) from Redis",
  "deletedCount": 5
}
```

---

## Error Response Format

All error responses follow this standard format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": "Technical error details (optional)"
}
```

### Common HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request (missing or invalid parameters) |
| `404` | Not Found (resource doesn't exist) |
| `500` | Internal Server Error (server/Redis error) |

---

## JavaScript/TypeScript Examples

### Fetch All Rooms
```javascript
const response = await fetch('http://localhost:3001/api/redis/rooms');
const data = await response.json();
console.log(data.rooms);
```

### Get Room by ID
```javascript
const roomId = 'room-123';
const response = await fetch(`http://localhost:3001/api/redis/room/${roomId}`);
const data = await response.json();
console.log(data.room);
```

### Get Rooms by Category
```javascript
const category = 'Electronics';
const response = await fetch(`http://localhost:3001/api/redis/rooms/category/${category}`);
const data = await response.json();
console.log(data.rooms);
```

### Get All Categories
```javascript
const response = await fetch('http://localhost:3001/api/redis/categories');
const data = await response.json();
console.log(data.categories);
```

### Create/Update Room
```javascript
const response = await fetch('http://localhost:3001/api/redis/room', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    roomId: 'room-123',
    productCategory: 'Electronics'
  })
});
const data = await response.json();
console.log(data.room);
```

### Delete Room
```javascript
const roomId = 'room-123';
const response = await fetch(`http://localhost:3001/api/redis/room/${roomId}`, {
  method: 'DELETE'
});
const data = await response.json();
console.log(data.message);
```

### Clear All Rooms
```javascript
const response = await fetch('http://localhost:3001/api/redis/clear', {
  method: 'DELETE'
});
const data = await response.json();
console.log(data.deletedCount);
```

---

## cURL Examples

### Get All Rooms
```bash
curl http://localhost:3001/api/redis/rooms
```

### Get Room by ID
```bash
curl http://localhost:3001/api/redis/room/room-123
```

### Get Rooms by Category
```bash
curl http://localhost:3001/api/redis/rooms/category/Electronics
```

### Get All Categories
```bash
curl http://localhost:3001/api/redis/categories
```

### Create/Update Room
```bash
curl -X POST http://localhost:3001/api/redis/room \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room-123",
    "productCategory": "Electronics"
  }'
```

### Delete Room
```bash
curl -X DELETE http://localhost:3001/api/redis/room/room-123
```

### Clear All Rooms
```bash
curl -X DELETE http://localhost:3001/api/redis/clear
```

---

## Notes

1. **Redis Key Pattern:** All rooms are stored with the key pattern `room:{roomId}`
2. **Case Sensitivity:** Category matching is case-insensitive
3. **TTL:** Rooms do not have automatic expiration (TTL). They persist until manually deleted
4. **Database:** Uses Redis database 3 (or as configured in `REDIS_URL`)
5. **Key Prefix:** Uses prefix `hackthon-13:` (or as configured)

---

## Base URL Configuration

- **Development:** `http://localhost:3001/api/redis`
- **Production:** Update base URL according to your deployment

---

**Last Updated:** 2024-01-15
