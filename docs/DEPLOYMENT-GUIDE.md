# Deployment Guide

> [2025-11-12 03:30:00] Complete deployment guide for production release

## Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 15+
- Docker & Docker Compose (optional, for containerized deployment)
- Stripe account with API keys
- Sentry account (optional, for error tracking)

## Pre-Deployment Checklist

1. ✅ All environment variables configured
2. ✅ Database migrations tested
3. ✅ Build scripts verified
4. ✅ Docker images built and tested
5. ✅ Smoke tests passing
6. ✅ Monitoring configured (Sentry, logs)
7. ✅ Backup strategy in place

## Step-by-Step Deployment

### 1. Environment Setup

#### Backend Environment

```bash
cd backend
cp env.example .env
# Edit .env with production values:
# - DATABASE_URL (production PostgreSQL)
# - JWT_SECRET (strong random secret)
# - STRIPE_SECRET_KEY (production key)
# - STRIPE_WEBHOOK_SECRET (from Stripe dashboard)
# - SENTRY_DSN (if using Sentry)
```

#### Frontend Environment

```bash
cd apps/web
cp .env.example .env.production
# Edit .env.production with production values:
# - NEXT_PUBLIC_API_URL (production API endpoint)
# - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (production key)
# - NEXT_PUBLIC_SENTRY_DSN (if using Sentry)
# - NEXT_PUBLIC_SITE_URL (production site URL)
```

### 2. Database Setup

```bash
# Run migrations
./scripts/db-migrate.sh

# Create initial backup
./scripts/db-backup.sh
```

### 3. Build Application

```bash
# Build all services
./scripts/build.sh

# Or build individually:
npm run build --workspace apps/web
npm run build --workspace backend  # if build script exists
```

### 4. Docker Deployment

```bash
# Build and start services
docker compose up --build -d

# Or use deployment script
./scripts/deploy.sh production --build
```

### 5. Verify Deployment

```bash
# Run smoke tests
./scripts/e2e-smoke.sh https://your-domain.com https://api.your-domain.com/api

# Check service health
docker compose ps
docker compose logs backend
docker compose logs web
```

## Production Configuration

### Database Backup Strategy

- **Automated backups**: Set up cron job to run `./scripts/db-backup.sh` daily
- **Retention**: Script keeps last 7 backups automatically
- **Storage**: Store backups in secure location (S3, encrypted volume)

### Monitoring Setup

#### Sentry

1. Create Sentry project
2. Get DSN from project settings
3. Add to environment variables:
   - Backend: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`
   - Frontend: `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT`

#### Stripe Webhooks

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://api.your-domain.com/api/webhooks/stripe`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### Logging

- Backend logs: Check `docker compose logs backend` or application logs
- Frontend logs: Check browser console and Sentry
- Database logs: Check PostgreSQL logs

## Rollback Procedure

### Quick Rollback

```bash
# Stop current services
docker compose down

# Restore previous Docker images (if using version tags)
docker pull your-registry/backend:previous-version
docker pull your-registry/web:previous-version

# Restart with previous images
docker compose up -d
```

### Database Rollback

```bash
# Restore from backup
./scripts/db-restore.sh backups/backup_YYYYMMDD_HHMMSS.dump

# Or rollback specific migration
cd backend
npx prisma migrate resolve --rolled-back migration_name
```

## Post-Deployment Verification

1. ✅ Homepage loads correctly
2. ✅ Product listing works
3. ✅ Product detail pages load
4. ✅ Cart functionality works
5. ✅ Checkout flow completes
6. ✅ Admin dashboard accessible
7. ✅ Offline orders kanban board works
8. ✅ API endpoints respond correctly
9. ✅ Database connections stable
10. ✅ No errors in Sentry

## Troubleshooting

### Services won't start

```bash
# Check logs
docker compose logs backend
docker compose logs web

# Verify environment variables
docker compose exec backend env | grep DATABASE_URL
docker compose exec web env | grep NEXT_PUBLIC_API_URL
```

### Database connection issues

```bash
# Test connection
docker compose exec backend npx prisma db pull

# Check migration status
docker compose exec backend npx prisma migrate status
```

### Build failures

```bash
# Clear build cache
docker compose build --no-cache

# Check Node version
node --version  # Should be 18+

# Verify dependencies
npm install
```

## Security Checklist

- [ ] All secrets in environment variables (not committed)
- [ ] Database credentials rotated
- [ ] JWT secret is strong and unique
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] HTTPS enabled (use reverse proxy like Nginx)
- [ ] Firewall rules configured
- [ ] Regular security updates scheduled

## Performance Optimization

- Enable Next.js production optimizations
- Configure CDN for static assets
- Enable database connection pooling
- Set up Redis caching (if configured)
- Monitor API response times
- Set up load balancing (if needed)

## Support & Maintenance

- **Backup frequency**: Daily automated backups
- **Update schedule**: Weekly security updates, monthly feature updates
- **Monitoring**: 24/7 Sentry alerts for critical errors
- **Log retention**: 14 days minimum

For detailed release checklist, see `docs/RELEASE-CHECKLIST.md`.
