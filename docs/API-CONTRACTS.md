<!-- [2025-11-11 22:35:05] API contract snapshot authored -->

# Backend API Contracts & Auth Flow

## Overview

- **Base URL**: `http://localhost:8000/api` (configurable via `PORT`)
- **Authentication**: JWT issued on `/auth/login` stored as `token` cookie (`httpOnly`, `sameSite=lax`). Guest carts use a `sessionId` cookie.
- **Rate limiting**: 100 req/min per IP via `express-rate-limit` on `/api/*`.
- **CORS**: Controlled by `FRONTEND_URL` (`http://localhost:8080` default) with credentials enabled.

## Authentication Lifecycle

1. **Register** `POST /auth/register` → creates user, returns success payload. Passwords hashed via controller.
2. **Login** `POST /auth/login` → validates credentials, signs JWT (`JWT_SECRET`), sets `token` cookie, returns user summary.
3. **Session check** `GET /auth/me` → requires valid cookie/Bearer token, returns user profile & role.
4. **Logout** `POST /auth/logout` → clears auth cookie.
5. **Password reset**  
   - `POST /auth/forgot-password` → issues reset token (email delivery TBD).  
   - `POST /auth/reset-password` → validates token, updates password.

> The middleware in `src/middleware/auth.js` provides `authenticate`, `authenticateOptional`, and `requireAdmin`. Admin-only routes currently comment out `requireAdmin` pending role UX.

## Storefront Endpoints

| Endpoint | Method | Description | Response Shape | Notes |
| --- | --- | --- | --- | --- |
| `/products` | GET | Paginated list with optional `page`, `limit`, `collection`, `search`, `sort`, `order` | `{ data: Product[], pagination: { page, limit, total, totalPages } }` | Each product includes primary image, category, brand, sample variant. |
| `/products/:slug` | GET | Detailed product with variants, images, reviews | Product + `rating: { average, count }` | Returns 404 if slug missing. |
| `/collections` | GET | All collections | `Collection[]` | Includes slug, name, and hero imagery if available. |
| `/collections/:slug` | GET | Collection detail | Collection with associated products (see controller) | Add hero metadata before FE migration. |
| `/cart` | GET | Active cart for user or guest session | `{ items, subtotal, total, shipping, tax }` | Requires `authenticateOptional`; uses JWT or sessionId cookie. |
| `/cart/items` | POST | Add variant to cart | Updated cart payload | Body: `{ variantId, quantity }`. |
| `/cart/items/:id` | PATCH | Update quantity | Updated cart payload | Body: `{ quantity }`. |
| `/cart/items/:id` | DELETE | Remove item | Updated cart payload | — |
| `/cart` | DELETE | Clear entire cart | `{ success: true }` | — |
| `/checkout/prepare` | POST | Snapshot cart & pricing before payment | Preparation payload (see controller) | Auth optional; ensures cart ready. |
| `/checkout/shipping-rates` | POST | Calculate shipping by address | `{ rates: [{ id, name, cost, estimatedDays }] }` | Body: `{ address }`. |
| `/checkout/create-payment-intent` | POST | Initiate Stripe payment | `{ clientSecret, paymentIntentId, amount }` | Requires Stripe keys configured. |
| `/checkout/confirm` | POST | Finalize order | `Order` | Consumes paymentIntent + addresses; returns canonical order. |
| `/orders` | GET | Authenticated user orders | `{ data: Order[] }` | Uses `authenticate`. Add pagination if needed. |
| `/orders/:id` | GET | Order detail by ID | `Order` | Auth required and must own order. |
| `/orders/number/:orderNumber` | GET | Lookup by order number & email | `Order` | Public access with email query param. |
| `/offline-orders` | POST | Offline POD intake with uploads | `{ id, status }` | Multer-managed file uploads; optional auth. |

## Admin Endpoints

| Endpoint | Method | Description | Auth |
| --- | --- | --- | --- |
<!-- [2025-11-11 23:27:48] 记录后台商品与分类管理接口 -->
| `/admin/products` | GET | List products (pagination, search, status) | TODO: enable `requireAdmin` |
| `/admin/products` | POST | Create product with variants/images | TODO: enable `requireAdmin` |
| `/admin/products/:id` | GET | Product detail with variants/images | TODO: enable `requireAdmin` |
| `/admin/products/:id` | PUT | Update product core fields and relations | TODO: enable `requireAdmin` |
| `/admin/products/:id` | DELETE | Archive product (soft delete) | TODO: enable `requireAdmin` |
| `/admin/products/:id/status` | PATCH | Toggle product active state | TODO: enable `requireAdmin` |
| `/admin/categories` | GET | List categories (pagination, filters) | TODO: enable `requireAdmin` |
| `/admin/categories` | POST | Create category | TODO: enable `requireAdmin` |
| `/admin/categories/:id` | GET | Category detail with children | TODO: enable `requireAdmin` |
| `/admin/categories/:id` | PUT | Update category fields | TODO: enable `requireAdmin` |
| `/admin/categories/:id` | DELETE | Archive category (set inactive) | TODO: enable `requireAdmin` |
| `/admin/offline-orders` | GET | List offline orders | TODO: enable `requireAdmin`. |
| `/admin/offline-orders/:id` | GET | Offline order detail | TODO: enable `requireAdmin`. |
| `/admin/offline-orders/:id` | PATCH | Update offline order payload | TODO: enable `requireAdmin`. |
| `/admin/offline-orders/:id/stage` | PATCH | Advance workflow stage | TODO: enable `requireAdmin`. |
| `/admin/offline-orders/config/stages` | GET/PUT | Manage stage templates | TODO: enable `requireAdmin`. |
| `/admin/offline-orders/metrics/summary` | GET | Metrics snapshot | TODO: enable `requireAdmin`. |
| `/admin/cost-management/summary` | GET | Cost metrics overview | TODO: enable `requireAdmin`. |
| `/admin/cost-management/products` | GET | Product cost table | TODO: enable `requireAdmin`. |
| `/admin/cost-management/products/:id` | PUT | Update product cost inputs | TODO: enable `requireAdmin`. |
| `/admin/cost-management/categories` | GET | Cost categories | TODO: enable `requireAdmin`. |

> Reintroduce `requireAdmin` middleware once admin login UX is live. Until then, rely on network isolation/private deployments.

## Webhooks

| Endpoint | Method | Purpose | Notes |
| --- | --- | --- | --- |
| `/webhooks/stripe` | POST | Handles Stripe event notifications | Use Stripe CLI signing secret; route expects raw JSON body (`express.raw`). |

## Security Considerations

- Rotate `JWT_SECRET` per environment; do not use default placeholder.
- Ensure HTTPS termination in production so cookies with `secure: true` transmit.
- After admin UX ready, audit `/api/orders` to ensure only owners or admins can enumerate orders.
- Multer uploads stored under `uploads/offline-orders`; add antivirus scanning before production use.

