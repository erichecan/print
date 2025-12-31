/**
 * Playwright Configuration for GCP Production Testing
* 用于测试 GCP 生产环境的配置，不需要本地服务
 */
import { defineConfig, devices } from '@playwright/test';

// 更新为最新的线上 URL
const FRONTEND_URL = process.env.BASE_URL || 'https://print-main-frontend-234065158862.us-central1.run.app';
const BACKEND_URL = process.env.API_BASE_URL || 'https://print-main-backend-234065158862.us-central1.run.app';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // 使用单个 worker 避免并发问题
timeout: 60000, // 增加测试超时时间到 60 秒
  reporter: [
    ['line'],
    ['html', { open: 'never', outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/test-results.json' }],
  ],
outputDir: 'test-results/artifacts', // 将测试输出目录与 HTML 报告目录分开
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    extraHTTPHeaders: {
      'x-playwright-e2e': 'true',
    },
// 增加导航超时时间
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // 不启动本地服务，直接测试生产环境
  webServer: undefined,
  // 跳过全局设置（不需要重置数据库）
  globalSetup: undefined,
});

