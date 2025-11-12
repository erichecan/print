<!-- [2025-11-11 22:20:55] Frontend/Backend migration matrix drafted -->

# Frontend ↔ Backend Migration Matrix

## Storefront (Next.js `apps/web`)

| Frontend Route | Feature Scope | Backend Endpoint(s) | Implementation Status | Notes |
| --- | --- | --- | --- | --- |
| `/` | Landing hero, featured collections, merchandising highlights | `GET /api/products`, `GET /api/collections` | Needs data wiring | Home page currently static; plan to hydrate hero grids from products and collections once design priorities are final. |
| `/products` | Product catalog with pagination, filters, sort | `GET /api/products` | Scaffold missing | `page.tsx` is empty—migrate layout from `prototype/static-pages/products.html`, connect to `productsApi.list`. |
| `/products/[slug]` | Product detail, variant selection, add to cart | `GET /api/products/:slug`, `POST /api/cart/items`, `PATCH /api/cart/items/:id` | In progress | Page consumes `productsApi` and `CartContext`; confirm backend sends variant color hex and stock counts per migration rollout. |
| `/collections/[slug]` | Collection landing pages | `GET /api/collections/:slug`, `GET /api/products?collection=` | Scaffold missing | Implement dynamic collection view using prototype content blocks; ensure controller returns collection metadata needed for hero banners. |
| `/cart` | Cart review, quantity updates | `GET /api/cart`, `PATCH /api/cart/items/:id`, `DELETE /api/cart/items/:id` | Implemented (client state) | Relies on `CartContext`; verify backend session/cart persistence before launch. |
| `/checkout` | Checkout, shipping rates, payment intent, confirmation | `POST /api/checkout/prepare`, `POST /api/checkout/shipping-rates`, `POST /api/checkout/create-payment-intent`, `POST /api/checkout/confirm` | In progress | Stripe flow implemented; backend needs shipping rate calculator + payment intent integration fully verified. |
| `/orders/[orderNumber]` | Order confirmation/status lookup | `GET /api/orders/number/:orderNumber` | Implemented | Requires email query param; backend must protect against enumeration (rate limiting already configured). |
| `/login`, `/register`, `/forgot-password` | Auth flows | `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `GET /api/auth/me`, `POST /api/auth/logout` | Implemented | Ensure cookie/session setup aligns with CORS (`NEXT_PUBLIC_API_URL`) and production domain. |
| `/admin` | Admin dashboard (orders overview) | `GET /api/auth/me`, `GET /api/orders` | Prototype-level | Requires role enforcement; orders endpoint currently public—add admin guard in backend before production. |

## Admin & Operational Tools

| Legacy Asset | Destination Plan | Backend Support | Migration Notes |
| --- | --- | --- | --- |
| `prototype/admin/**/*` | Rebuild as authenticated Next.js routes under `/admin/*` | `GET /api/admin/offline-orders/*`, `GET /api/admin/cost-management/*` | Admin API guards marked TODO; reintroduce `requireAdmin` middleware once JWT/session strategy finalised. |
| `prototype/static-pages/offline-pod-intake.html` | Convert to wizard in `/admin/offline-orders` | `POST /api/offline-orders` (file upload) | Ensure multer storage path remains valid; add client uploader component with progress indicators. |
| Marketing pages (about, contact, returns, etc.) | Migrate into Next.js static routes using `app/(marketing)/...` | Mostly content only | Use new layouts and keep SEO metadata; static pages can fetch from CMS once ready. |

## Migration Backlog Overview

- **Feature parity list**: Home merchandising, catalog filters, collection pages, marketing static pages, admin dashboards, offline order workflow, cost management console.
- **Backend gaps**:
  - Reinstate admin auth middleware on `/api/admin/*`.
  - Document shipping-rate algorithm and Stripe intent implementation for checkout handoff.
  - Expand `/api/products` query params to cover planned filters (color, size, price) if not already mapped.
- **Frontend gaps**:
  - Build catalog and collection page scaffolds; integrate design tokens from prototypes.
  - Establish shared layout components for marketing pages to replace legacy HTML templates.
  - Route protection for `/admin` leveraging `authApi.me` and role checks.

## Next Steps

1. Confirm product/collection data requirements with merchandising stakeholders, then implement `/products` and `/collections/[slug]` pages.
2. Lock down admin auth strategy and re-enable backend middleware before exposing operational tools.
3. Migrate marketing content into Next.js routes, referencing assets under `/assets` served by the backend.

