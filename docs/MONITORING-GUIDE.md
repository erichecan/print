# Monitoring & Alerting Configuration Guide

> [2025-11-12 03:35:00] Complete guide for setting up monitoring and alerting

## Overview

This project uses Sentry for error tracking and monitoring. Stripe webhooks are configured for payment event notifications.

## Sentry Setup

### 1. Create Sentry Project

1. Go to [sentry.io](https://sentry.io) and sign up/login
2. Create a new project:
   - Platform: **Node.js** (for backend)
   - Platform: **Next.js** (for frontend)
3. Copy the DSN from project settings

### 2. Backend Configuration

Add to `backend/.env`:

```env
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

The backend already includes Sentry initialization in `backend/src/app.js`. Verify it's configured:

```javascript
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  });
}
```

### 3. Frontend Configuration

Add to `apps/web/.env.production`:

```env
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
```

Next.js Sentry integration is configured in `apps/web/sentry.client.config.ts` and `sentry.server.config.ts` (if they exist).

### 4. Configure Alerts

In Sentry Dashboard:

1. Go to **Alerts** → **Create Alert Rule**
2. Set conditions:
   - **When**: An issue is created
   - **For**: All environments or specific environment
3. Add actions:
   - **Email**: Send to team email
   - **Slack**: Connect Slack workspace (optional)
4. Save alert rule

**Recommended Alert Rules:**

- **Critical Errors**: Issues with level "error" or "fatal"
- **Payment Failures**: Issues containing "payment" or "stripe"
- **Order Failures**: Issues containing "order" or "checkout"
- **Database Errors**: Issues containing "database" or "prisma"

## Stripe Webhook Configuration

### 1. Create Webhook Endpoint

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter endpoint URL: `https://api.your-domain.com/api/webhooks/stripe`
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
5. Click **Add endpoint**

### 2. Get Webhook Secret

1. After creating endpoint, click on it
2. Copy the **Signing secret** (starts with `whsec_`)
3. Add to `backend/.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

### 3. Test Webhook

Use Stripe CLI to test locally:

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
stripe trigger payment_intent.succeeded
```

## Logging Configuration

### Backend Logging

Backend uses Winston for logging. Configure log level in `backend/.env`:

```env
LOG_LEVEL=info  # debug, info, warn, error
```

Logs are written to:
- Console (stdout/stderr)
- File (if configured): `backend/logs/app.log`

### Frontend Logging

Frontend logs to browser console. In production:
- Errors are automatically sent to Sentry
- Console logs are minimized in production build

## Health Check Endpoints

### Backend Health Check

Add health check endpoint (if not exists):

```javascript
// backend/src/routes/health.js
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
```

### Frontend Health Check

Frontend health is verified by:
- Homepage loads successfully
- API endpoints respond
- No critical JavaScript errors

## Monitoring Dashboard

### Key Metrics to Monitor

1. **Error Rate**: Track Sentry error count
2. **API Response Time**: Monitor slow endpoints
3. **Payment Success Rate**: Track Stripe webhook events
4. **Database Performance**: Monitor query times
5. **Uptime**: Track service availability

### Recommended Tools

- **Sentry**: Error tracking and performance monitoring
- **Stripe Dashboard**: Payment metrics and webhook logs
- **PostgreSQL Monitoring**: Use pgAdmin or similar
- **Server Monitoring**: Use CloudWatch, Datadog, or similar

## Alert Response Procedures

### Critical Errors

1. Check Sentry for error details
2. Review recent deployments
3. Check database connectivity
4. Verify environment variables
5. Check service logs
6. Rollback if necessary (see `docs/DEPLOYMENT-GUIDE.md`)

### Payment Failures

1. Check Stripe Dashboard for payment status
2. Review webhook logs in Stripe
3. Check backend logs for webhook processing errors
4. Verify `STRIPE_WEBHOOK_SECRET` is correct
5. Test webhook endpoint manually

### Database Errors

1. Check database connection string
2. Verify database is running
3. Check migration status
4. Review recent schema changes
5. Check database logs

## Maintenance Schedule

- **Daily**: Review Sentry errors
- **Weekly**: Review payment success rates
- **Monthly**: Review performance metrics
- **Quarterly**: Security audit and dependency updates

## Testing Monitoring

### Test Sentry Integration

```bash
# Backend: Trigger test error
curl -X POST http://localhost:3001/api/test-error

# Frontend: Open browser console and trigger error
# Check Sentry dashboard for error
```

### Test Stripe Webhooks

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# or download from https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Trigger test event
stripe trigger payment_intent.succeeded
```

## Troubleshooting

### Sentry Not Receiving Events

1. Verify DSN is correct
2. Check network connectivity
3. Verify Sentry project is active
4. Check Sentry initialization in code
5. Review Sentry dashboard for rate limits

### Stripe Webhooks Not Working

1. Verify webhook secret matches
2. Check webhook endpoint is accessible
3. Review Stripe webhook logs
4. Verify webhook signature validation
5. Test with Stripe CLI

### Logs Not Appearing

1. Check log level configuration
2. Verify log file permissions
3. Check disk space
4. Review log rotation settings
5. Verify logging is enabled

For more details, see `docs/RELEASE-CHECKLIST.md` section on monitoring.

