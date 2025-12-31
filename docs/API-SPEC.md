# API Specification

**Base URL**:  
- Production: https://api.suvernireplus.com  
- Staging: https://staging-api.suvernireplus.com  
- Development: http://localhost:3000/api

**Authentication**: JWT Bearer Token  
**Header**: `Authorization: Bearer {token}`

---

## 1. Authentication

### POST /api/auth/register
Register a new user account.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response** (201):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

---

### POST /api/auth/login
Authenticate user and get access token.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "uuid", "email": "user@example.com" }
}
```

---

### POST /api/auth/send-code
Send one-time verification code (for passwordless login).

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Response** (200):
```json
{
  "message": "Verification code sent to your email",
  "expiresIn": 300
}
```

---

### POST /api/auth/verify-code
Verify one-time code and complete login.

**Request**:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "uuid", "email": "user@example.com" }
}
```

---

### POST /api/auth/reset-password
Request password reset email.

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Response** (200):
```json
{
  "message": "Password reset link sent to your email"
}
```

---

## 2. Products

### GET /api/products
List all products with optional filters.

**Query Parameters**:
- `category` - Filter by category slug
- `brand` - Filter by brand slug
- `color` - Filter by color
- `size` - Filter by size
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `sort` - Sort by: `price-asc`, `price-desc`, `name-asc`, `rating-desc`
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 24)

**Response** (200):
```json
{
  "products": [
    {
      "id": "108200",
      "name": "Gildan Midweight 50/50 Pullover Hoodie",
      "slug": "gildan-midweight-50-50-pullover-hoodie",
      "description": "50/50 cotton-poly blend...",
      "basePrice": 24.99,
      "thumbnail": "/assets/products/hoodie-thumb.jpg",
      "rating": 4.5,
      "reviewCount": 128,
      "isCustomizable": true,
      "category": { "id": "3", "name": "Hoodies", "slug": "hoodies" },
      "brand": { "id": "1", "name": "Gildan" }
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 24,
    "totalPages": 7
  }
}
```

---

### GET /api/products/:id
Get single product with full details.

**Response** (200):
```json
{
  "id": "108200",
  "name": "Gildan Midweight 50/50 Pullover Hoodie",
  "slug": "gildan-midweight-50-50-pullover-hoodie",
  "description": "50/50 cotton-poly blend. Pouch pocket. Tear-away label.",
  "basePrice": 24.99,
  "isCustomizable": true,
  "sku": "GIL-200",
  "stockQuantity": 500,
  "rating": 4.5,
  "reviewCount": 128,
  "images": [
    { "url": "/assets/products/hoodie-front.jpg", "alt": "Front view", "isPrimary": true },
    { "url": "/assets/products/hoodie-back.jpg", "alt": "Back view", "isPrimary": false }
  ],
  "variants": [
    {
      "id": "1",
      "color": "Royal Blue",
      "colorHex": "#2B3A8F",
      "size": "M",
      "sku": "GIL-200-ROY-M",
      "priceAdjustment": 0,
      "stockQuantity": 50,
      "imageUrl": "/assets/products/hoodie-royal.jpg"
    }
  ],
  "category": { "id": "3", "name": "Hoodies", "slug": "hoodies" },
  "brand": { "id": "1", "name": "Gildan" },
  "availableColors": ["Black", "Royal Blue", "Red", "Navy"],
  "availableSizes": ["S", "M", "L", "XL", "2XL", "3XL"]
}
```

---

### GET /api/products/:id/reviews
Get reviews for a product.

**Response** (200):
```json
{
  "reviews": [
    {
      "id": "rev-1",
      "user": { "name": "John D.", "verified": true },
      "rating": 5,
      "title": "Great quality!",
      "comment": "Perfect for custom printing...",
"createdAt": "T10:30:00Z"
    }
  ],
  "summary": {
    "average": 4.5,
    "total": 128,
    "counts": { "5": 80, "4": 30, "3": 12, "2": 4, "1": 2 }
  }
}
```

---

### GET /api/categories
List all product categories.

**Response** (200):
```json
[
  {
    "id": "1",
    "name": "T-Shirts",
    "slug": "t-shirts",
    "description": "Custom t-shirts",
    "imageUrl": "/assets/categories/tshirts.jpg",
    "productCount": 150
  }
]
```

---

### GET /api/brands
List all brands.

**Response** (200):
```json
[
  {
    "id": "1",
    "name": "Gildan",
    "slug": "gildan",
    "logoUrl": "/assets/brands/gildan.png"
  }
]
```

---

## 3. Shopping Cart

### GET /api/cart
Get current user's cart (requires auth).

**Response** (200):
```json
{
  "items": [
    {
      "id": "item-1",
      "productId": "108200",
      "productName": "Gildan Midweight 50/50 Pullover Hoodie",
      "variantId": "1",
      "color": "Royal Blue",
      "size": "M",
      "designId": "design-123",
      "designThumbnail": "/assets/designs/thumb-123.jpg",
      "quantity": 2,
      "unitPrice": 24.99,
      "subtotal": 49.98,
      "thumbnail": "/assets/products/hoodie-royal.jpg"
    }
  ],
  "subtotal": 49.98,
  "shipping": 0,
  "discount": 0,
  "total": 49.98,
  "itemCount": 2
}
```

---

### POST /api/cart/items
Add item to cart.

**Request**:
```json
{
  "productId": "108200",
  "variantId": "1",
  "quantity": 1,
  "designId": "design-123",
  "designData": { "layers": [...], "products": [...], "view": "front" }
}
```

**Response** (201):
```json
{
  "id": "item-1",
  "productId": "108200",
  "quantity": 1
}
```

---

### PUT /api/cart/items/:id
Update cart item quantity.

**Request**:
```json
{
  "quantity": 3
}
```

**Response** (200):
```json
{
  "message": "Item updated",
  "item": { "id": "item-1", "quantity": 3 }
}
```

---

### DELETE /api/cart/items/:id
Remove item from cart.

**Response** (200):
```json
{
  "message": "Item removed from cart"
}
```

---

### POST /api/cart/coupon
Apply coupon code.

**Request**:
```json
{
  "code": "SAVE20"
}
```

**Response** (200):
```json
{
  "discount": 10.00,
  "type": "percentage",
  "value": 20,
  "message": "Coupon applied: 20% off"
}
```

---

### DELETE /api/cart/coupon
Remove applied coupon.

**Response** (200):
```json
{
  "message": "Coupon removed"
}
```

---

## 4. Orders

### POST /api/orders
Create new order (place order).

**Request**:
```json
{
  "items": ["item-1", "item-2"],
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "addressLine1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US",
    "phone": "+1234567890"
  },
  "billingAddress": { "same as shipping" },
  "paymentMethod": "stripe",
  "paymentToken": "tok_visa_1234",
  "deliveryOption": "standard",
  "couponCode": "SAVE20"
}
```

**Response** (201):
```json
{
  "orderId": "ORD-2025-1001",
  "orderNumber": "ORD-2025-1001",
  "status": "pending",
"estimatedDelivery": "",
  "total": 39.98
}
```

---

### GET /api/orders/:id
Get order details.

**Response** (200):
```json
{
  "id": "ORD-2025-1001",
  "orderNumber": "ORD-2025-1001",
  "status": "processing",
"createdAt": "T10:00:00Z",
"estimatedDelivery": "",
  "items": [
    {
      "productName": "Gildan Midweight 50/50 Pullover Hoodie",
      "color": "Royal Blue",
      "size": "M",
      "quantity": 2,
      "unitPrice": 24.99,
      "subtotal": 49.98,
      "designThumbnail": "/assets/designs/thumb-123.jpg"
    }
  ],
  "subtotal": 49.98,
  "shipping": 9.99,
  "discount": 10.00,
  "total": 49.97,
  "shippingAddress": { ... },
  "billingAddress": { ... },
  "paymentMethod": "Stripe ending in 4242",
  "trackingNumber": "TRK123456789"
}
```

---

### GET /api/user/orders
List user's orders.

**Response** (200):
```json
{
  "orders": [
    {
      "id": "ORD-2025-1001",
      "orderNumber": "ORD-2025-1001",
      "status": "shipped",
"createdAt": "T10:00:00Z",
      "total": 49.97,
      "itemCount": 2,
      "thumbnail": "/assets/products/hoodie-thumb.jpg"
    }
  ],
  "total": 5
}
```

---

### POST /api/orders/:id/cancel
Cancel an order.

**Response** (200):
```json
{
  "message": "Order cancelled successfully",
  "refundAmount": 49.97
}
```

---

### GET /api/orders/:id/tracking
Get order tracking information.

**Response** (200):
```json
{
  "trackingNumber": "TRK123456789",
  "carrier": "UPS",
  "status": "in_transit",
"estimatedDelivery": "",
  "events": [
    {
"date": "T08:00:00Z",
      "location": "New York, NY",
      "status": "Shipped"
    }
  ]
}
```

---

## 5. Designs

### POST /api/designs
Save a design.

**Request**:
```json
{
  "name": "My Custom Hoodie Design",
  "productId": "108200",
  "designData": {
    "layers": [
      {
        "id": "layer-1",
        "type": "text",
        "content": "Hello World",
        "position": { "x": "50%", "y": "45%" },
        "transform": { "scale": 1.2, "rotate": 0 },
        "styles": { "fontFamily": "Inter", "color": "#FF1F3D", "fontSize": 36 }
      }
    ],
    "products": [ { "productId": "108200", "variantId": "1" } ],
    "view": "front",
"createdAt": "T12:00:00Z"
  },
  "isPublic": false
}
```

**Response** (201):
```json
{
  "id": "design-123",
  "name": "My Custom Hoodie Design",
  "thumbnailUrl": "/assets/designs/thumb-123.jpg",
"createdAt": "T12:00:00Z"
}
```

---

### GET /api/designs/:id
Get saved design.

**Response** (200):
```json
{
  "id": "design-123",
  "name": "My Custom Hoodie Design",
  "productId": "108200",
  "designData": { ... },
  "thumbnailUrl": "/assets/designs/thumb-123.jpg",
  "status": "saved",
"createdAt": "T12:00:00Z"
}
```

---

### PUT /api/designs/:id
Update a saved design.

**Response** (200):
```json
{
  "message": "Design updated successfully"
}
```

---

### DELETE /api/designs/:id
Delete a design.

**Response** (200):
```json
{
  "message": "Design deleted successfully"
}
```

---

### GET /api/user/designs
List user's saved designs.

**Response** (200):
```json
{
  "designs": [
    {
      "id": "design-123",
      "name": "My Custom Hoodie Design",
      "thumbnailUrl": "/assets/designs/thumb-123.jpg",
"createdAt": "T12:00:00Z",
      "productName": "Gildan Midweight 50/50 Pullover Hoodie"
    }
  ],
  "total": 12
}
```

---

### POST /api/uploads
Upload an image file.

**Request**: Multipart form-data
- `file`: Image file

**Response** (201):
```json
{
  "url": "/assets/uploads/user-upload-xyz.jpg",
  "filename": "my-logo.jpg",
  "size": 25600,
  "mimeType": "image/jpeg"
}
```

---

## 6. User Profile

### GET /api/user/profile
Get user profile.

**Response** (200):
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "emailVerified": true,
"createdAt": "T00:00:00Z"
}
```

---

### PUT /api/user/profile
Update user profile.

**Response** (200):
```json
{
  "message": "Profile updated successfully"
}
```

---

### GET /api/user/addresses
List user addresses.

**Response** (200):
```json
{
  "addresses": [
    {
      "id": "addr-1",
      "type": "shipping",
      "firstName": "John",
      "lastName": "Doe",
      "addressLine1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "US",
      "isDefault": true
    }
  ]
}
```

---

## 7. Admin - Products

### GET /api/admin/products
List all products (admin).

**Response** (200):
```json
{
  "products": [ ... ],
  "pagination": { ... }
}
```

---

### POST /api/admin/products
Create new product (admin).

**Response** (201):
```json
{
  "id": "prod-999",
  "message": "Product created successfully"
}
```

---

### PUT /api/admin/products/:id
Update product (admin).

**Response** (200):
```json
{
  "message": "Product updated successfully"
}
```

---

### DELETE /api/admin/products/:id
Delete product (admin).

**Response** (200):
```json
{
  "message": "Product deleted successfully"
}
```

---

## 8. Admin - Orders

### GET /api/admin/orders
List all orders (admin).

**Response** (200):
```json
{
  "orders": [ ... ],
  "pagination": { ... }
}
```

---

### PUT /api/admin/orders/:id/status
Update order status (admin).

**Request**:
```json
{
  "status": "shipped",
  "trackingNumber": "TRK123456789"
}
```

**Response** (200):
```json
{
  "message": "Order status updated"
}
```

---

## 9. Admin - Designs

### GET /api/admin/designs
List all designs (admin).

**Response** (200):
```json
{
  "designs": [ ... ]
}
```

---

### POST /api/admin/designs/:id/review
Approve or reject a design for public use.

**Request**:
```json
{
  "action": "approve"
}
```

**Response** (200):
```json
{
  "message": "Design approved"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error",
  "details": {
    "email": "Invalid email format",
    "quantity": "Must be a positive number"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "message": "Please login to access this resource"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Product not found"
}
```

### 422 Validation Error
```json
{
  "error": "Validation failed",
  "details": { ... }
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

- Anonymous: 60 requests/minute
- Authenticated: 300 requests/minute
- Admin: 600 requests/minute

**Headers**:
- `X-RateLimit-Limit` - Total allowed requests
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Reset time (Unix timestamp)

