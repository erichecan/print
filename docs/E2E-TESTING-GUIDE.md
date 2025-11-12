# E2E Testing Guide

> [2025-11-12 03:40:00] Guide for setting up and running end-to-end tests

## Overview

This project supports E2E testing using Playwright (recommended) or Cypress. The smoke test script (`scripts/e2e-smoke.sh`) provides basic API health checks, while full E2E tests cover critical user flows.

## Quick Start

### Option 1: Playwright (Recommended)

```bash
# Install Playwright
npm install --save-dev @playwright/test
npx playwright install

# Run tests
npx playwright test

# Run in UI mode
npx playwright test --ui
```

### Option 2: Cypress

```bash
# Install Cypress
npm install --save-dev cypress

# Open Cypress
npx cypress open

# Run headless
npx cypress run
```

## Test Structure

```
tests/
├── e2e/
│   ├── auth.spec.ts          # Authentication flows
│   ├── products.spec.ts      # Product browsing
│   ├── cart.spec.ts          # Shopping cart
│   ├── checkout.spec.ts      # Checkout flow
│   └── admin.spec.ts         # Admin dashboard
└── api/
    └── smoke.spec.ts         # API health checks
```

## Example Test: Playwright

Create `tests/e2e/products.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Product Pages', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle(/Suvernire Plus/);
  });

  test('should navigate to products page', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('text=Products');
    await expect(page).toHaveURL(/\/products/);
  });

  test('should display product list', async ({ page }) => {
    await page.goto('http://localhost:3000/products');
    await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible();
  });

  test('should open product detail page', async ({ page }) => {
    await page.goto('http://localhost:3000/products');
    await page.click('[data-testid="product-card"]:first-child');
    await expect(page).toHaveURL(/\/products\/.+/);
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

## Example Test: Cypress

Create `cypress/e2e/products.cy.js`:

```javascript
describe('Product Pages', () => {
  it('should load homepage', () => {
    cy.visit('http://localhost:3000');
    cy.title().should('contain', 'Suvernire Plus');
  });

  it('should navigate to products page', () => {
    cy.visit('http://localhost:3000');
    cy.contains('Products').click();
    cy.url().should('include', '/products');
  });

  it('should display product list', () => {
    cy.visit('http://localhost:3000/products');
    cy.get('[data-testid="product-card"]').should('be.visible');
  });

  it('should open product detail page', () => {
    cy.visit('http://localhost:3000/products');
    cy.get('[data-testid="product-card"]').first().click();
    cy.url().should('match', /\/products\/.+/);
    cy.get('h1').should('be.visible');
  });
});
```

## Admin Tests

Create `tests/e2e/admin.spec.ts` (Playwright):

```typescript
import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000/admin/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/);
  });

  test('should load admin dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should navigate to offline orders', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');
    await page.click('text=Offline Orders');
    await expect(page).toHaveURL(/\/admin\/offline-orders/);
    await expect(page.locator('.offline-board')).toBeVisible();
  });

  test('should display kanban board', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/offline-orders');
    await expect(page.locator('.board-columns')).toBeVisible();
  });
});
```

## Configuration Files

### Playwright Config

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev --workspace apps/web',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Cypress Config

Create `cypress.config.js`:

```javascript
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  video: false,
  screenshotOnRunFailure: true,
});
```

## Running Tests

### Development

```bash
# Start services
npm run dev --workspace apps/web &
npm run dev --workspace backend &

# Run tests
npx playwright test
# or
npx cypress run
```

### CI/CD

```bash
# Install dependencies
npm install

# Build application
npm run build --workspace apps/web

# Run tests
npx playwright test --reporter=json
# or
npx cypress run --headless
```

## Test Data Setup

Create `tests/fixtures/test-data.ts`:

```typescript
export const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'admin123',
  },
  customer: {
    email: 'customer@test.com',
    password: 'customer123',
  },
};

export const testProducts = {
  tshirt: {
    slug: 'custom-tshirt',
    name: 'Custom T-Shirt',
  },
};
```

## Best Practices

1. **Use data-testid attributes** for reliable selectors
2. **Wait for network idle** before assertions
3. **Clean up test data** after each test
4. **Use fixtures** for reusable test data
5. **Mock external services** (Stripe, email) in tests
6. **Run tests in parallel** for faster execution
7. **Take screenshots** on failure for debugging

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/e2e.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build --workspace apps/web
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Tests fail locally but pass in CI

- Check environment variables
- Verify database state
- Check network connectivity
- Review browser version differences

### Flaky tests

- Add explicit waits
- Use `waitForSelector` instead of `sleep`
- Check for race conditions
- Review test isolation

### Slow tests

- Run tests in parallel
- Use test sharding
- Optimize selectors
- Mock slow APIs

## Next Steps

1. Install Playwright or Cypress
2. Create test configuration files
3. Write tests for critical user flows
4. Set up CI/CD integration
5. Add test coverage reporting

For smoke tests (quick API checks), use `scripts/e2e-smoke.sh`.

