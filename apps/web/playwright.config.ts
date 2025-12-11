/**
 * Playwright Configuration
 * [2025-01-27 11:45:00] E2E 测试配置
 * [2025-11-24 10:25:11] 重构：加载 .env.test、启用多服务 + 全局前置
 */
import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// [2025-11-24 10:25:11] 统一加载 E2E 环境变量（默认指向 configs/e2e.test.envvars）
const appRoot = __dirname;
const repoRoot = path.resolve(appRoot, '../..'); // [2025-11-24 11:10:00] 纠正 repo 根路径，指向 /print-main
const backendDir = path.resolve(repoRoot, 'backend');
const frontendDir = path.resolve(repoRoot, 'apps/web');
// [2025-11-24 11:05:00] 使用绝对路径，避免 webServer 在不同 CWD 下 cd 失败
const defaultEnvFile = path.resolve(repoRoot, 'configs/e2e.test.envvars');
const envFile = process.env.E2E_ENV_FILE || defaultEnvFile;
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
} else {
  console.warn(`[E2E config] 环境文件缺失：${envFile}，请先执行 cp configs/e2e.test.envvars .env.test`);
}

const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const apiURL = process.env.API_BASE_URL || 'http://localhost:4000';
const apiReadyUrl = `${apiURL.replace(/\/+$/, '')}/api/products?limit=1`; // [2025-11-24 11:12:30] 使用稳定 200 接口检测后端

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['line'], ['html', { open: 'never' }]],
  snapshotDir: './tests/e2e/__screenshots__',
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    extraHTTPHeaders: {
      'x-playwright-e2e': 'true',
    },
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
  // [2025-11-24 11:12:30] 允许通过 SKIP_WEB_SERVER=1 手动控制服务启动
  // [2025-01-31 19:35:00] 如果本地服务器已运行，复用现有服务器
  webServer: process.env.SKIP_WEB_SERVER === '1'
    ? undefined
    : [
        {
          command: `cd ${backendDir} && cross-env NODE_ENV=test PORT=${new URL(apiURL).port || 4000} npm run dev`,
          url: apiReadyUrl,
          reuseExistingServer: true, // [2025-01-31 19:35:00] 复用现有服务器
          stdout: 'pipe',
          stderr: 'pipe',
        },
        {
          command: `cd ${frontendDir} && npm run dev`,
          url: baseURL,
          reuseExistingServer: true, // [2025-01-31 19:35:00] 复用现有服务器
          stdout: 'pipe',
          stderr: 'pipe',
        },
      ],
});

