# Get All Products API Contract

## Endpoint

**`GET /api/products`**

## Description

Retrieves all products from the database with optional pagination and sorting capabilities.

---

## Base URL

```
http://localhost:3006/api/products
```

*(Port may vary based on `PRODUCT_API_PORT` environment variable)*

---

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | `1` | Page number for pagination (starts at 1) |
| `limit` | integer | No | `50` | Number of products per page |
| `sortBy` | string | No | `'name'` | Field to sort by. Options: `name`, `price`, `rating`, `category`, `stock` |
| `order` | string | No | `'asc'` | Sort order. Options: `'asc'` (ascending) or `'desc'` (descending) |

---

## Request Examples

### Basic Request (Get All Products)
```http
GET /api/products
```

### With Pagination
```http
GET /api/products?page=1&limit=20
```

### With Sorting
```http
GET /api/products?sortBy=price&order=desc
```

### Complete Example
```http
GET /api/products?page=2&limit=10&sortBy=price&order=desc
```

### JavaScript/Fetch Example
```javascript
// Basic request
const response = await fetch('http://localhost:3006/api/products');
const data = await response.json();

// With pagination and sorting
const response = await fetch(
  'http://localhost:3006/api/products?page=1&limit=20&sortBy=price&order=desc'
);
const data = await response.json();
```

### cURL Example
```bash
# Basic request
curl http://localhost:3006/api/products

# With parameters
curl "http://localhost:3006/api/products?page=1&limit=20&sortBy=price&order=desc"
```

---

## Response Format

### Success Response (200 OK)

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
    },
    {
      "id": "prod-2",
      "name": "Another Product",
      "description": "Another description",
      "category": "Fashion",
      "price": 49.99,
      "rating": 4.2,
      "stock": 100,
      "brand": "Another Brand",
      "image": "https://example.com/image2.jpg"
    }
  ],
  "count": 20,
  "total": 50,
  "page": 1,
  "totalPages": 3
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` for successful requests |
| `products` | array | Array of product objects |
| `products[].id` | string | Unique product identifier |
| `products[].name` | string | Product name |
| `products[].description` | string | Product description |
| `products[].category` | string | Product category (e.g., "Electronics", "Fashion", "Books") |
| `products[].price` | number | Product price (decimal) |
| `products[].rating` | number | Product rating (0-5) |
| `products[].stock` | number | Available stock quantity |
| `products[].brand` | string | Product brand name (optional) |
| `products[].image` | string | Product image URL |
| `count` | number | Number of products in current page |
| `total` | number | Total number of products available |
| `page` | number | Current page number |
| `totalPages` | number | Total number of pages |

---

## Error Responses

### 503 Service Unavailable (Redis Not Connected)

```json
{
  "error": "Redis connection not available"
}
```

**Solution:** Ensure Redis is running and properly configured.

### 500 Internal Server Error

```json
{
  "error": "Failed to fetch products"
}
```

**Solution:** Check server logs for detailed error information.

---

## Sorting Options

The `sortBy` parameter accepts the following values:

- `name` - Sort by product name (default)
- `price` - Sort by product price
- `rating` - Sort by product rating
- `category` - Sort by product category
- `stock` - Sort by stock quantity

The `order` parameter accepts:
- `asc` - Ascending order (A-Z, 0-9, low to high) - **Default**
- `desc` - Descending order (Z-A, 9-0, high to low)

---

## Pagination

Pagination is handled via `page` and `limit` parameters:

- **Page 1** returns products 1 to `limit`
- **Page 2** returns products `limit+1` to `2*limit`
- And so on...

**Example:**
- `page=1&limit=10` → Products 1-10
- `page=2&limit=10` → Products 11-20
- `page=3&limit=10` → Products 21-30

---

## Usage Examples

### Get First 10 Products Sorted by Price (High to Low)

```javascript
const response = await fetch(
  'http://localhost:3006/api/products?page=1&limit=10&sortBy=price&order=desc'
);
const data = await response.json();

console.log(`Found ${data.total} total products`);
console.log(`Showing page ${data.page} of ${data.totalPages}`);
data.products.forEach(product => {
  console.log(`${product.name} - $${product.price}`);
});
```

### Get All Products (No Pagination)

```javascript
// Get all products by setting a high limit
const response = await fetch(
  'http://localhost:3006/api/products?limit=1000'
);
const data = await response.json();

// Or fetch all pages
async function getAllProducts() {
  let allProducts = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `http://localhost:3006/api/products?page=${page}&limit=50`
    );
    const data = await response.json();
    
    allProducts = allProducts.concat(data.products);
    hasMore = page < data.totalPages;
    page++;
  }

  return allProducts;
}
```

### React Example

```jsx
import { useState, useEffect } from 'react';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchProducts();
  }, [page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3006/api/products?page=${page}&limit=20`
      );
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.products);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {products.map(product => (
            <div key={product.id}>
              <h3>{product.name}</h3>
              <p>${product.price}</p>
            </div>
          ))}
          <div>
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## Notes

1. **Default Behavior**: If no parameters are provided, returns first 50 products sorted by name (ascending)

2. **Performance**: For large datasets, always use pagination to avoid loading too many products at once

3. **Sorting**: String fields (like `name`, `category`) are sorted case-insensitively

4. **Redis Dependency**: This endpoint requires Redis to be running. If Redis is unavailable, returns 503 error

5. **CORS**: The API supports CORS for cross-origin requests from allowed origins

---

## Related Endpoints

- `GET /api/products/search` - Search products with filters
- `GET /api/products/category/:category` - Get products by category
- `GET /api/products/:productId` - Get single product by ID
- `GET /api/products/categories/list` - Get all categories

---

## Test URLs

```
# Basic
http://localhost:3006/api/products

# Paginated
http://localhost:3006/api/products?page=1&limit=10

# Sorted by price (high to low)
http://localhost:3006/api/products?sortBy=price&order=desc

# Complete example
http://localhost:3006/api/products?page=2&limit=20&sortBy=rating&order=desc
```

---

**Last Updated:** 2024-01-15  
**Version:** 1.0.0
