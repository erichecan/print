# Database Schema

**Technology Stack**:
- Database: PostgreSQL 14+
- ORM: Sequelize (Node.js) / Django ORM (Python)
- File Storage: AWS S3 / Aliyun OSS
- Cache: Redis (for sessions, cart, product catalog)

---

## Tables

### 1. users

User accounts (customers and admins).

**Columns**:
- `id` (UUID, Primary Key)
- `email` (VARCHAR(255), Unique, Indexed)
- `password_hash` (VARCHAR(255), NOT NULL)
- `first_name` (VARCHAR(100))
- `last_name` (VARCHAR(100))
- `phone` (VARCHAR(20))
- `role` (ENUM: 'customer', 'admin', NOT NULL, Default: 'customer')
- `email_verified` (BOOLEAN, Default: false)
- `created_at` (TIMESTAMP, Default: now())
- `updated_at` (TIMESTAMP, Default: now())

**Indexes**:
- `idx_users_email` on `email`
- `idx_users_role` on `role`
- `idx_users_created_at` on `created_at`

---

### 2. addresses

User shipping and billing addresses.

**Columns**:
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → users.id, CASCADE DELETE)
- `type` (ENUM: 'shipping', 'billing', NOT NULL)
- `first_name` (VARCHAR(100))
- `last_name` (VARCHAR(100))
- `company` (VARCHAR(255), nullable)
- `address_line1` (VARCHAR(255))
- `address_line2` (VARCHAR(255), nullable)
- `city` (VARCHAR(100))
- `state` (VARCHAR(100))
- `zip_code` (VARCHAR(20))
- `country` (VARCHAR(100), Default: 'US')
- `phone` (VARCHAR(20))
- `is_default` (BOOLEAN, Default: false)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes**:
- `idx_addresses_user_id` on `user_id`
- `idx_addresses_type` on `type`

---

### 3. categories

Product categories with hierarchy.

**Columns**:
- `id` (UUID, Primary Key)
- `name` (VARCHAR(255))
- `slug` (VARCHAR(255), Unique, Indexed)
- `description` (TEXT, nullable)
- `image_url` (VARCHAR(500), nullable)
- `parent_id` (UUID, Foreign Key → categories.id, nullable)
- `sort_order` (INTEGER, Default: 0)
- `is_active` (BOOLEAN, Default: true)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes**:
- `idx_categories_slug` on `slug`
- `idx_categories_parent_id` on `parent_id`

---

### 4. brands

Product brands.

**Columns**:
- `id` (UUID, Primary Key)
- `name` (VARCHAR(255))
- `slug` (VARCHAR(255), Unique, Indexed)
- `logo_url` (VARCHAR(500), nullable)
- `description` (TEXT, nullable)
- `is_active` (BOOLEAN, Default: true)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes**:
- `idx_brands_slug` on `slug`

---

### 5. products

Main product catalog.

**Columns**:
- `id` (UUID, Primary Key)
- `category_id` (UUID, Foreign Key → categories.id)
- `brand_id` (UUID, Foreign Key → brands.id, nullable)
- `name` (VARCHAR(255))
- `slug` (VARCHAR(255), Unique, Indexed)
- `description` (TEXT, nullable)
- `long_description` (TEXT, nullable)
- `base_price` (DECIMAL(10,2))
- `is_customizable` (BOOLEAN, Default: true)
- `sku` (VARCHAR(100), Unique)
- `stock_quantity` (INTEGER, Default: 0)
- `weight` (DECIMAL(8,2), nullable)
- `dimensions` (VARCHAR(100), nullable)
- `is_active` (BOOLEAN, Default: true)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes**:
- `idx_products_slug` on `slug`
- `idx_products_category_id` on `category_id`
- `idx_products_brand_id` on `brand_id`
- `idx_products_is_active` on `is_active`

---

### 6. product_variants

Color and size variants for products.

**Columns**:
- `id` (UUID, Primary Key)
- `product_id` (UUID, Foreign Key → products.id, CASCADE DELETE)
- `color` (VARCHAR(100))
- `color_hex` (VARCHAR(7), nullable)
- `size` (VARCHAR(20), nullable)
- `sku` (VARCHAR(100), Unique)
- `price_adjustment` (DECIMAL(10,2), Default: 0)
- `stock_quantity` (INTEGER, Default: 0)
- `image_url` (VARCHAR(500), nullable)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes**:
- `idx_product_variants_product_id` on `product_id`
- `idx_product_variants_sku` on `sku`

---

### 7. product_images

Product and variant images.

**Columns**:
- `id` (UUID, Primary Key)
- `product_id` (UUID, Foreign Key → products.id, CASCADE DELETE)
- `variant_id` (UUID, Foreign Key → product_variants.id, nullable)
- `image_url` (VARCHAR(500))
- `alt_text` (VARCHAR(255), nullable)
- `sort_order` (INTEGER, Default: 0)
- `is_primary` (BOOLEAN, Default: false)
- `created_at` (TIMESTAMP)

**Indexes**:
- `idx_product_images_product_id` on `product_id`
- `idx_product_images_variant_id` on `variant_id`

---

### 8. product_reviews

Customer product reviews.

**Columns**:
- `id` (UUID, Primary Key)
- `product_id` (UUID, Foreign Key → products.id, CASCADE DELETE)
- `user_id` (UUID, Foreign Key → users.id, nullable)
- `order_id` (UUID, Foreign Key → orders.id, nullable)
- `rating` (INTEGER, CHECK: 1-5)
- `title` (VARCHAR(255))
- `comment` (TEXT)
- `is_verified_purchase` (BOOLEAN, Default: false)
- `helpful_count` (INTEGER, Default: 0)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes**:
- `idx_product_reviews_product_id` on `product_id`
- `idx_product_reviews_user_id` on `user_id`
- `idx_product_reviews_created_at` on `created_at` DESC

---

### 9. cart_items

Shopping cart items.

**Columns**:
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → users.id, nullable, Indexed)
- `session_id` (VARCHAR(255), nullable, Indexed, for guest carts)
- `product_id` (UUID, Foreign Key → products.id)
- `variant_id` (UUID, Foreign Key → product_variants.id, nullable)
- `design_id` (UUID, Foreign Key → designs.id, nullable)
- `quantity` (INTEGER, Default: 1)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes**:
- `idx_cart_items_user_id` on `user_id`
- `idx_cart_items_session_id` on `session_id`
- `idx_cart_items_product_id` on `product_id`
- UNIQUE constraint on (`user_id`, `product_id`, `variant_id`, `design_id`) OR (`session_id`, `product_id`, `variant_id`, `design_id`)

---

### 10. orders

Order header.

**Columns**:
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → users.id)
- `order_number` (VARCHAR(50), Unique, Indexed)
- `status` (ENUM: 'pending', 'processing', 'shipped', 'delivered', 'cancelled', Default: 'pending')
- `subtotal` (DECIMAL(10,2))
- `shipping_cost` (DECIMAL(10,2))
- `tax` (DECIMAL(10,2))
- `discount` (DECIMAL(10,2), Default: 0)
- `total` (DECIMAL(10,2))
- `shipping_address_id` (UUID, Foreign Key → addresses.id)
- `billing_address_id` (UUID, Foreign Key → addresses.id)
- `payment_method` (VARCHAR(50))
- `payment_status` (ENUM: 'pending', 'paid', 'failed', 'refunded')
- `payment_transaction_id` (VARCHAR(255), nullable)
- `tracking_number` (VARCHAR(255), nullable)
- `carrier` (VARCHAR(100), nullable)
- `estimated_delivery` (DATE, nullable)
- `notes` (TEXT, nullable)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes**:
- `idx_orders_order_number` on `order_number`
- `idx_orders_user_id` on `user_id`
- `idx_orders_status` on `status`
- `idx_orders_created_at` on `created_at` DESC

---

### 11. order_items

Order line items.

**Columns**:
- `id` (UUID, Primary Key)
- `order_id` (UUID, Foreign Key → orders.id, CASCADE DELETE)
- `product_id` (UUID, Foreign Key → products.id)
- `variant_id` (UUID, Foreign Key → product_variants.id, nullable)
- `design_id` (UUID, Foreign Key → designs.id, nullable)
- `product_name` (VARCHAR(255), snapshot at time of order)
- `variant_description` (VARCHAR(255), nullable)
- `quantity` (INTEGER)
- `unit_price` (DECIMAL(10,2))
- `subtotal` (DECIMAL(10,2))
- `product_snapshot` (JSONB, nullable, stores full product details)
- `created_at` (TIMESTAMP)

**Indexes**:
- `idx_order_items_order_id` on `order_id`
- `idx_order_items_product_id` on `product_id`

---

### 12. designs

User-created custom designs.

**Columns**:
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → users.id, nullable, for drafts)
- `product_id` (UUID, Foreign Key → products.id)
- `name` (VARCHAR(255))
- `design_data` (JSONB, stores layers, positions, colors, transforms)
- `thumbnail_url` (VARCHAR(500), nullable)
- `status` (ENUM: 'draft', 'saved', 'approved', 'rejected', Default: 'saved')
- `is_public` (BOOLEAN, Default: false)
- `views` (INTEGER, Default: 0)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes**:
- `idx_designs_user_id` on `user_id`
- `idx_designs_product_id` on `product_id`
- `idx_designs_status` on `status`
- `idx_designs_created_at` on `created_at` DESC

**design_data JSONB Structure**:
```json
{
  "layers": [
    {
      "id": "layer-1",
      "type": "text|image|art",
      "content": "Hello World",
      "position": { "x": "50%", "y": "45%" },
      "transform": { "scale": 1.2, "rotate": 0 },
      "styles": {
        "fontFamily": "Inter",
        "fontSize": 36,
        "color": "#FF1F3D",
        "letterSpacing": 0,
        "lineHeight": 1.2,
        "textAlign": "center",
        "outline": { "width": 0, "color": "#000" },
        "shadow": { "x": 1, "y": 1, "blur": 0 }
      },
      "assetUrl": null
    }
  ],
  "products": [{
    "productId": "108200",
    "variantId": "1",
    "view": "front"
  }],
  "view": "front|back|sleeve",
"createdAt": "T12:00:00Z"
}
```

---

### 13. design_assets

Individual assets within a design.

**Columns**:
- `id` (UUID, Primary Key)
- `design_id` (UUID, Foreign Key → designs.id, CASCADE DELETE)
- `type` (ENUM: 'upload', 'text', 'clipart', NOT NULL)
- `asset_url` (VARCHAR(500), nullable, for uploads)
- `asset_data` (JSONB, nullable, for text/clipart properties)
- `sort_order` (INTEGER, Default: 0)
- `created_at` (TIMESTAMP)

**Indexes**:
- `idx_design_assets_design_id` on `design_id`

---

### 14. coupons

Promotional coupon codes.

**Columns**:
- `id` (UUID, Primary Key)
- `code` (VARCHAR(50), Unique, Indexed)
- `type` (ENUM: 'percentage', 'fixed', NOT NULL)
- `value` (DECIMAL(10,2))
- `min_order_value` (DECIMAL(10,2), nullable)
- `max_discount` (DECIMAL(10,2), nullable)
- `usage_limit` (INTEGER, nullable, total uses)
- `user_usage_limit` (INTEGER, nullable, per user)
- `used_count` (INTEGER, Default: 0)
- `start_date` (DATE)
- `end_date` (DATE)
- `is_active` (BOOLEAN, Default: true)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes**:
- `idx_coupons_code` on `code`
- `idx_coupons_is_active` on `is_active`

---

### 15. promotions

Marketing promotions and banners.

**Columns**:
- `id` (UUID, Primary Key)
- `title` (VARCHAR(255))
- `description` (TEXT, nullable)
- `banner_image_url` (VARCHAR(500), nullable)
- `link_url` (VARCHAR(500), nullable)
- `start_date` (DATE, nullable)
- `end_date` (DATE, nullable)
- `is_active` (BOOLEAN, Default: true)
- `sort_order` (INTEGER, Default: 0)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes**:
- `idx_promotions_is_active` on `is_active`
- `idx_promotions_sort_order` on `sort_order`

---

### 16. uploads

User-uploaded files.

**Columns**:
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → users.id, nullable)
- `file_name` (VARCHAR(255))
- `original_name` (VARCHAR(255))
- `file_url` (VARCHAR(500))
- `file_size` (INTEGER, bytes)
- `mime_type` (VARCHAR(100))
- `width` (INTEGER, nullable)
- `height` (INTEGER, nullable)
- `created_at` (TIMESTAMP)

**Indexes**:
- `idx_uploads_user_id` on `user_id`
- `idx_uploads_created_at` on `created_at` DESC

---

### 17. settings

System-wide settings (key-value store).

**Columns**:
- `id` (UUID, Primary Key)
- `key` (VARCHAR(100), Unique, Indexed)
- `value` (JSONB, nullable)
- `updated_by` (UUID, Foreign Key → users.id, nullable)
- `updated_at` (TIMESTAMP, Default: now())

**Indexes**:
- `idx_settings_key` on `key`

**Common Keys**:
- `site_name`
- `site_description`
- `contact_email`
- `contact_phone`
- `shipping_base_cost`
- `free_shipping_threshold`
- `tax_rate`
- `payment_methods`

---

### 18. sessions

User sessions for authentication and cart persistence.

**Columns**:
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → users.id, nullable)
- `token` (VARCHAR(500), Unique)
- `expires_at` (TIMESTAMP, Indexed)
- `ip_address` (VARCHAR(45), nullable)
- `user_agent` (VARCHAR(500), nullable)
- `created_at` (TIMESTAMP)

**Indexes**:
- `idx_sessions_token` on `token`
- `idx_sessions_user_id` on `user_id`
- `idx_sessions_expires_at` on `expires_at`

---

### 19. order_address_snapshots

Snapshot of shipping/billing addresses at time of order.

**Columns**:
- `id` (UUID, Primary Key)
- `order_id` (UUID, Foreign Key → orders.id, CASCADE DELETE)
- `type` (ENUM: 'shipping', 'billing')
- `first_name` (VARCHAR(100))
- `last_name` (VARCHAR(100))
- `address_line1` (VARCHAR(255))
- `address_line2` (VARCHAR(255), nullable)
- `city` (VARCHAR(100))
- `state` (VARCHAR(100))
- `zip_code` (VARCHAR(20))
- `country` (VARCHAR(100))
- `phone` (VARCHAR(20), nullable)

**Indexes**:
- `idx_order_address_snapshots_order_id` on `order_id`

---

## Relationships Summary

```
users (1) ──── (N) addresses
users (1) ──── (N) cart_items
users (1) ──── (N) orders
users (1) ──── (N) designs
users (1) ──── (N) product_reviews
users (1) ──── (N) uploads

categories (1) ──── (N) products
brands (1) ──── (N) products
categories (1) ──── (N) categories (self-referencing for hierarchy)

products (1) ──── (N) product_variants
products (1) ──── (N) product_images
products (1) ──── (N) product_reviews
products (1) ──── (N) cart_items
products (1) ──── (N) order_items
products (1) ──── (N) designs

product_variants (1) ──── (N) product_images
product_variants (1) ──── (N) cart_items
product_variants (1) ──── (N) order_items

designs (1) ──── (N) design_assets
designs (1) ──── (N) cart_items
designs (1) ──── (N) order_items

orders (1) ──── (N) order_items
orders (1) ──── (N) order_address_snapshots

addresses (1) ──── (N) orders (shipping)
addresses (1) ──── (N) orders (billing)
```

---

## Cascade Delete Rules

- Deleting a user → deletes cart_items, designs (if user-specific)
- Deleting a product → deletes product_variants, product_images, cart_items, order_items (via CASCADE or retention policy)
- Deleting a category → set category_id to NULL or prevent if products exist
- Deleting a brand → set brand_id to NULL or prevent if products exist
- Deleting a design → deletes design_assets, cart_items, order_items (snapshot in order_items)
- Deleting an order → deletes order_items, order_address_snapshots

---

## Indexes Summary

**Primary Keys**: All tables have UUID primary keys  
**Foreign Keys**: All relationships indexed  
**Unique Constraints**: email, order_number, sku, code (coupons)  
**Composite Indexes**: (user_id, created_at) for user activity queries

---

## Data Types

- **UUID**: PostgreSQL UUID type for all IDs
- **DECIMAL**: Money amounts (10,2) for precision
- **JSONB**: Complex nested data (design data, settings, snapshots)
- **ENUM**: Predefined value sets
- **TIMESTAMP**: ISO 8601 timestamps
- **VARCHAR**: Text fields with appropriate limits
- **TEXT**: Unlimited text for descriptions
- **BOOLEAN**: True/false flags

---

## Migrations

Initial schema should support:
1. Creating all tables
2. Adding all indexes
3. Setting up foreign keys with cascade rules
4. Inserting initial admin user
5. Inserting basic categories and brands
6. Setting up default system settings

---

## Seed Data

Initial data to populate:
- Admin user account
- Product categories (T-Shirts, Hoodies, etc.)
- Popular brands (Gildan, Hanes, Jerzees)
- Sample products for each category
- System settings defaults

