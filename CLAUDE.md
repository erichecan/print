# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

```
printngo/
├── apps/web/          # Next.js 14 App Router frontend (port 3000)
├── backend/           # Express.js REST API backend (port 3001)
├── prisma/            # Shared Prisma schema + migrations
│   └── schema.prisma  # Single source of truth for DB models
├── shopify/           # Python pipeline: scrape Gildan → generate AI product images → Shopify CSV
├── scripts/           # One-off data scripts (crawlers, ingest, seed)
└── cloudbuild.yaml    # GCP Cloud Run deployment for both services
```

## Dev Commands

```bash
# Frontend (from apps/web/)
npm run dev            # Next.js dev server → http://localhost:3000
npm run build          # Production build
npm run test           # Jest unit tests
npm run test:e2e       # Playwright E2E tests

# Backend (from backend/)
npm run dev            # nodemon → http://localhost:3001
npm run start:prod     # Production (NODE_ENV=production node server.js)

# Database (from repo root)
npm run db:migrate     # prisma migrate dev
npm run db:seed        # prisma db seed (cross-env ts-node prisma/seed.ts)
npm run db:seed:pricing   # node backend/scripts/seed-size-pricing.js
npx prisma generate    # Regenerate client after schema changes
npx prisma studio      # Visual DB browser

# Shopify Python pipeline (from shopify/)
source .venv/bin/activate
python app/batch.py           # Scrape → products.db
python app/pipeline.py        # AI image generation + recolor
python app/upload_to_shopify.py  # Push images to Shopify Files API
python app/make_shopify_csv.py   # Emit shopify_import.csv
```

## Architecture

### Frontend ↔ Backend

- Frontend (`apps/web/`) calls backend via `NEXT_PUBLIC_API_URL` (default `http://127.0.0.1:3001`).
- All auth is **JWT Bearer token**: login → receive token → store in `localStorage` or cookie → send `Authorization: Bearer <token>` on every protected request.
- Backend CORS allows `localhost:3000`, `printngoplus.com`, Cloud Run URLs, and Netlify preview URLs (configured in `backend/src/app.js`).

### Backend Layout (`backend/`)

```
server.js           # Entry: loads .env, validates env vars, runs Prisma migration on startup
src/app.js          # Express app: CORS, Helmet, rate limiting, route registration
src/routes/         # ~55 route files (auth, products, orders, admin/*, design-lab, etc.)
src/middleware/     # Auth middleware (JWT verify)
scripts/            # One-off seed scripts
```

The backend auto-runs `prisma migrate deploy` on startup in production. In development, run `npm run db:migrate` manually.

### Database

- **PostgreSQL** via **Neon** (cloud). Schema at `prisma/schema.prisma` (root level).
- `.env` in `backend/` holds `DATABASE_URL="postgresql://...?sslmode=require"`.
- `NODE_TLS_REJECT_UNAUTHORIZED=0` is set globally in `server.js` to work around Cloud Run TLS issues — do not remove.

### Frontend Layout (`apps/web/src/app/`)

Key page groups: `admin/`, `design-lab/`, `checkout/`, `catalog/`, `collections/`, `account/`, `orders/`, `blog/`, `offline-orders/`.

The `(main)/` route group wraps most public-facing pages with a shared layout.

### GCP Deployment

`cloudbuild.yaml` builds and deploys both services to Cloud Run:
- Backend: Docker image from `backend/Dockerfile`
- Frontend: Docker image from `apps/web/Dockerfile`
- Both use `--min-instances=0` (zero idle cost)

## Key Conventions

### UI: Number Input Spinners

`<input type="number">` spinners are **globally hidden** in `apps/web/src/app/globals.css`. Do not re-enable them on new inputs.

### Environment Files

- Backend env: `backend/.env` (copy from `backend/env.example`)
- Frontend env: `apps/web/.env.local` (copy from `apps/web/.env.example`)
- Required backend vars: `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `FRONTEND_URL`
- Required frontend vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Shopify Python Pipeline (shopify/)

Separate project — see `shopify/CLAUDE.md` for full details. Store credentials go in `shopify/.env` as `SHOPIFY_SHOP_DOMAIN` + `SHOPIFY_ADMIN_API_TOKEN`.
