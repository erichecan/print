# Technical Architecture Document
# Print E-commerce Platform

**Document Version**: 1.0  
**Last Updated**: 2025-01-27 00:00:00  
**Status**: Active Development

---

## 1. System Overview

### 1.1 Architecture Pattern
- **Frontend**: Next.js 14 App Router (SSR/SSG)
- **Backend**: RESTful API (Express.js)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Deployment**: 
  - Frontend: Vercel
  - Backend API: Render/Railway (or VPS)
  - Database: Managed PostgreSQL (Render/Railway/Supabase)

### 1.2 Technology Stack

#### Frontend
- **Framework**: Next.js 14.2+ (App Router)
- **Language**: TypeScript
- **Styling**: CSS Modules / Tailwind CSS (TBD)
- **State Management**: React Context + SWR/React Query (TBD)
- **Forms**: React Hook Form
- **Payment UI**: Stripe Elements

#### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18+
- **Language**: TypeScript (推荐) / JavaScript
- **Validation**: express-validator
- **Authentication**: JWT + HTTP-only cookies
- **Rate Limiting**: express-rate-limit
- **Security**: helmet, cors

#### Database
- **Database**: PostgreSQL 14+
- **ORM**: Prisma 5+
- **Migrations**: Prisma Migrate

#### External Services
- **Payment**: Stripe (CAD only)
- **Shipping**: EasyShip (Phase 2)
- **Email**: Resend / SendGrid / Nodemailer (TBD)
- **Error Tracking**: Sentry (推荐)
- **Monitoring**: Vercel Analytics / Custom

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────┐
│   Next.js App   │ (Vercel)
│   (Frontend)    │
└────────┬────────┘
         │ HTTP/REST
         │
┌────────▼────────┐
│  Express API    │ (Render/Railway)
│   (Backend)     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│   PG  │ │ Redis │ (Optional - Cache/Sessions)
└───────┘ └───────┘
    │
    │ Webhooks
    │
┌───▼──────────┐
│   Stripe     │
│   EasyShip   │ (Phase 2)
└──────────────┘
```

### 2.2 Directory Structure

```
print-ecom-monorepo/
├── apps/
│   └── web/                    # Next.js Frontend
│       ├── src/
│       │   ├── app/            # App Router pages
│       │   ├── components/     # React components
│       │   ├── lib/            # Utilities, API clients
│       │   └── types/          # TypeScript types
│       ├── public/             # Static assets
│       └── package.json
│
├── backend/                    # Express API (Existing - to refactor)
│   └── src/
│       ├── routes/             # API routes
│       ├── controllers/        # Route handlers
│       ├── services/           # Business logic
│       ├── middleware/         # Custom middleware
│       └── utils/              # Helpers
│
├── prisma/                     # Prisma Schema & Migrations
│   ├── schema.prisma
│   └── migrations/
│
├── packages/                   # Shared packages (Optional)
│   └── shared-types/           # Shared TypeScript types
│
├── docs/                       # Documentation
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   └── CHANGELOG.md
│
├── .github/
│   └── workflows/
│       └── ci.yml              # CI/CD pipeline
│
└── package.json                # Root workspace config
```

---

## 3. Database Schema (Prisma)

### 3.1 Core Models

#### User
```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String    @map("password_hash")
  firstName     String?   @map("first_name")
  lastName      String?   @map("last_name")
  phone         String?
  role          UserRole  @default(CUSTOMER)
  emailVerified Boolean   @default(false) @map("email_verified")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  addresses     Address[]
  cartItems     CartItem[]
  orders        Order[]
  sessions      Session[]

  @@index([email])
  @@index([role])
  @@map("users")
}

enum UserRole {
  CUSTOMER
  ADMIN
}
```

#### Product
```prisma
model Product {
  id              String    @id @default(uuid())
  name            String
  slug            String    @unique
  description     String?   @db.Text
  longDescription String?   @map("long_description") @db.Text
  basePrice       Decimal   @map("base_price") @db.Decimal(10, 2)
  sku             String    @unique
  isCustomizable  Boolean   @default(true) @map("is_customizable")
  stockQuantity   Int       @default(0) @map("stock_quantity")
  weight          Decimal?  @db.Decimal(8, 2)
  dimensions      String?
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  categoryId      String    @map("category_id")
  category        Category  @relation(fields: [categoryId], references: [id])
  brandId         String?   @map("brand_id")
  brand           Brand?    @relation(fields: [brandId], references: [id])
  
  variants        ProductVariant[]
  images          ProductImage[]
  reviews         ProductReview[]
  collectionProducts CollectionProduct[]

  @@index([slug])
  @@index([categoryId])
  @@index([isActive])
  @@map("products")
}
```

#### ProductVariant
```prisma
model ProductVariant {
  id            String   @id @default(uuid())
  productId     String   @map("product_id")
  product       Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  color         String?
  colorHex      String?  @map("color_hex")
  size          String?
  sku           String   @unique
  priceAdjustment Decimal @default(0) @map("price_adjustment") @db.Decimal(10, 2)
  stockQuantity Int      @default(0) @map("stock_quantity")
  imageUrl      String?  @map("image_url")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  cartItems     CartItem[]
  orderItems    OrderItem[]

  @@index([productId])
  @@index([sku])
  @@map("product_variants")
}
```

#### Cart & CartItem
```prisma
model Cart {
  id        String     @id @default(uuid())
  userId    String?    @unique @map("user_id")
  user      User?      @relation(fields: [userId], references: [id])
  sessionId String?    @unique @map("session_id")
  createdAt DateTime   @default(now()) @map("created_at")
  updatedAt DateTime   @updatedAt @map("updated_at")

  items     CartItem[]

  @@map("carts")
}

model CartItem {
  id                String   @id @default(uuid())
  cartId            String   @map("cart_id")
  cart              Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  variantId         String   @map("variant_id")
  variant           ProductVariant @relation(fields: [variantId], references: [id])
  quantity          Int
  priceSnapshot     Decimal  @map("price_snapshot") @db.Decimal(10, 2)
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@index([cartId])
  @@index([variantId])
  @@map("cart_items")
}
```

#### Order & OrderItem
```prisma
model Order {
  id                String          @id @default(uuid())
  orderNumber       String          @unique @map("order_number")
  userId            String?         @map("user_id")
  user              User?           @relation(fields: [userId], references: [id])
  email             String
  status            OrderStatus     @default(PENDING)
  currency          String          @default("CAD")
  subtotal          Decimal         @db.Decimal(10, 2)
  shippingCost      Decimal         @default(0) @map("shipping_cost") @db.Decimal(10, 2)
  tax               Decimal         @default(0) @db.Decimal(10, 2)
  discount          Decimal         @default(0) @db.Decimal(10, 2)
  total             Decimal         @db.Decimal(10, 2)
  paymentStatus     PaymentStatus   @default(PENDING) @map("payment_status")
  paymentIntentId   String?         @unique @map("payment_intent_id")
  shippingAddress   Json            @map("shipping_address")
  billingAddress    Json            @map("billing_address")
  trackingNumber    String?         @map("tracking_number")
  carrier           String?
  estimatedDelivery DateTime?       @map("estimated_delivery")
  createdAt         DateTime        @default(now()) @map("created_at")
  updatedAt         DateTime        @updatedAt @map("updated_at")

  items             OrderItem[]
  shipments         Shipment[]

  @@index([userId])
  @@index([orderNumber])
  @@index([status])
  @@index([paymentStatus])
  @@map("orders")
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

model OrderItem {
  id            String   @id @default(uuid())
  orderId       String   @map("order_id")
  order         Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variantId     String   @map("variant_id")
  variant       ProductVariant @relation(fields: [variantId], references: [id])
  quantity      Int
  priceSnapshot Decimal  @map("price_snapshot") @db.Decimal(10, 2)
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([orderId])
  @@map("order_items")
}
```

#### Collection (Category)
```prisma
model Collection {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String?  @db.Text
  imageUrl    String?  @map("image_url")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  products    CollectionProduct[]

  @@index([slug])
  @@map("collections")
}

model CollectionProduct {
  collectionId String     @map("collection_id")
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  productId    String     @map("product_id")
  product      Product    @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@id([collectionId, productId])
  @@map("collection_products")
}
```

#### Session (for cart persistence)
```prisma
model Session {
  id        String   @id @default(uuid())
  userId    String?  @map("user_id")
  user      User?    @relation(fields: [userId], references: [id])
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([token])
  @@map("sessions")
}
```

#### Shipment (Phase 2 - EasyShip)
```prisma
model Shipment {
  id            String          @id @default(uuid())
  orderId       String          @map("order_id")
  order         Order           @relation(fields: [orderId], references: [id])
  carrier       String?
  trackingNumber String?        @unique @map("tracking_number")
  labelUrl      String?         @map("label_url")
  status        ShipmentStatus  @default(PENDING)
  createdAt     DateTime        @default(now()) @map("created_at")
  updatedAt     DateTime        @updatedAt @map("updated_at")

  @@index([orderId])
  @@index([trackingNumber])
  @@map("shipments")
}

enum ShipmentStatus {
  PENDING
  LABEL_CREATED
  IN_TRANSIT
  DELIVERED
  EXCEPTION
}
```

---

## 4. API Design

### 4.1 Base URL
- **Development**: `http://localhost:3001/api`
- **Production**: `https://api.yourdomain.com/api`

### 4.2 Authentication
- **Method**: JWT in HTTP-only cookies
- **Login**: `POST /api/auth/login` → Returns cookie
- **Logout**: `POST /api/auth/logout` → Clears cookie
- **Me**: `GET /api/auth/me` → Returns current user

### 4.3 API Endpoints

#### Auth
```
POST   /api/auth/register      # Register new user
POST   /api/auth/login         # Login (sets cookie)
POST   /api/auth/logout        # Logout (clears cookie)
GET    /api/auth/me            # Get current user
```

#### Products
```
GET    /api/products           # List products (query: ?page=1&limit=20&collection=&search=)
GET    /api/products/:slug     # Get product by slug
GET    /api/collections        # List collections
GET    /api/collections/:slug  # Get collection by slug
```

#### Cart
```
GET    /api/cart               # Get current cart
POST   /api/cart/items         # Add item to cart { variantId, quantity }
PATCH  /api/cart/items/:id     # Update item quantity { quantity }
DELETE /api/cart/items/:id     # Remove item from cart
DELETE /api/cart               # Clear cart
```

#### Checkout
```
POST   /api/checkout/prepare           # Prepare checkout (validate cart, calculate totals)
POST   /api/checkout/shipping-rates    # Get shipping rates { address }
POST   /api/checkout/create-payment-intent  # Create Stripe PaymentIntent
POST   /api/checkout/confirm           # Confirm order after payment { paymentIntentId }
```

#### Orders
```
GET    /api/orders             # List user's orders (auth required)
GET    /api/orders/:id         # Get order details
GET    /api/admin/orders       # List all orders (admin)
GET    /api/admin/orders/:id   # Get order details (admin)
POST   /api/admin/orders/:id/refund  # Process refund { amount? }
PATCH  /api/admin/orders/:id/status  # Update order status { status }
```

#### Admin - Products
```
GET    /api/admin/products
POST   /api/admin/products
GET    /api/admin/products/:id
PATCH  /api/admin/products/:id
DELETE /api/admin/products/:id
```

#### Admin - Collections
```
GET    /api/admin/collections
POST   /api/admin/collections
PATCH  /api/admin/collections/:id
DELETE /api/admin/collections/:id
```

#### Webhooks
```
POST   /api/webhooks/stripe    # Stripe webhook handler
POST   /api/webhooks/easyship  # EasyShip webhook handler (Phase 2)
```

---

## 5. Payment Integration (Stripe)

### 5.1 Setup
- **Currency**: CAD only
- **API Key**: Store in `STRIPE_SECRET_KEY` (env)
- **Webhook Secret**: Store in `STRIPE_WEBHOOK_SECRET` (env)

### 5.2 Payment Flow

1. **Frontend**: User clicks "Place Order"
2. **Backend**: `POST /api/checkout/create-payment-intent`
   - Validate cart
   - Calculate totals (subtotal + shipping + tax)
   - Create Stripe PaymentIntent with amount in cents (CAD)
   - Return `clientSecret`
3. **Frontend**: Use Stripe Elements to collect payment
   - Confirm PaymentIntent with `stripe.confirmPayment()`
4. **Backend**: `POST /api/checkout/confirm`
   - Verify PaymentIntent status
   - Create Order record
   - Return order confirmation
5. **Webhook**: `POST /api/webhooks/stripe`
   - Handle `payment_intent.succeeded` → Update order status
   - Handle `payment_intent.payment_failed` → Mark order as failed
   - Handle `charge.refunded` → Update refund status

### 5.3 Tax Calculation
- **Phase 1**: Simple tax rates by province/state (hardcoded)
- **Phase 2**: Integrate Stripe Tax API (recommended)

### 5.4 Refunds
- Admin triggers refund via `POST /api/admin/orders/:id/refund`
- Backend calls `stripe.refunds.create()`
- Webhook updates order status

---

## 6. Shipping Integration (EasyShip - Phase 2)

### 6.1 Phase 1: Static Rates
- **Canada**: Standard $9.99 CAD, Express $19.99 CAD
- **USA**: Standard $12.99 CAD
- Stored in backend config

### 6.2 Phase 2: EasyShip API
- **Rates**: `POST /api/checkout/shipping-rates` → Calls EasyShip API
- **Label Creation**: Admin dashboard → `POST /api/admin/shipments/:orderId/label`
- **Tracking**: Webhook updates shipment status

---

## 7. Security Considerations

### 7.1 API Security
- **CORS**: Configure allowed origins
- **Rate Limiting**: Apply to auth endpoints and checkout
- **CSRF**: Use SameSite cookies + CSRF tokens
- **Input Validation**: express-validator on all inputs
- **SQL Injection**: Prisma handles (parameterized queries)

### 7.2 Authentication
- JWT in HTTP-only cookies (not localStorage)
- Secure flag in production (HTTPS only)
- Refresh token rotation (optional, Phase 2)

### 7.3 Payment Security
- **PCI Compliance**: Never store card data
- All payment processing via Stripe Elements (client-side)
- Webhook signature verification

### 7.4 Environment Variables
```env
# Database
DATABASE_URL=postgresql://...

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_API_URL=http://localhost:3001/api
API_BASE_URL=http://localhost:3001
SESSION_SECRET=...

# Email (TBD)
EMAIL_API_KEY=...
```

---

## 8. Deployment Architecture

### 8.1 Frontend (Next.js)
- **Platform**: Vercel
- **Build**: Automatic on git push
- **Environment**: Set env vars in Vercel dashboard

### 8.2 Backend (Express)
- **Platform**: Render / Railway / VPS
- **Process**: PM2 or native Node.js process
- **Database**: Managed PostgreSQL (same provider or Supabase)

### 8.3 Database
- **Provider**: Render / Railway / Supabase
- **Backups**: Automated daily backups
- **Migrations**: Run via CI/CD or manual

### 8.4 CI/CD Pipeline
```
Git Push → GitHub Actions
  ├── Lint & Type Check
  ├── Run Tests
  ├── Build Frontend → Deploy to Vercel
  └── Build Backend → Deploy to Render
```

---

## 9. Monitoring & Observability

### 9.1 Error Tracking
- **Sentry**: Frontend + Backend error tracking
- Log unhandled exceptions and API errors

### 9.2 Logging
- **Backend**: Winston or Pino
- **Frontend**: Console logs + Sentry
- Structured logging with request IDs

### 9.3 Performance Monitoring
- **Vercel Analytics**: Frontend performance
- **API Response Times**: Log slow queries (>500ms)

### 9.4 Uptime Monitoring
- **Uptime Robot** or **Pingdom**: Monitor API endpoints

---

## 10. Future Enhancements

### Phase 2
- EasyShip integration
- Stripe Tax API
- Email notifications (Resend)
- User account features (order history, address management)

### Phase 3
- Product reviews
- Wishlist
- Coupon system
- Admin analytics dashboard
- Multi-language support (i18n)

---

**Document Owner**: Development Team  
**Review Frequency**: After each major milestone
