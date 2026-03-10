/**
* Playwright 全局前置：加载环境变量并重置测试数据库
 */
import { FullConfig } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

async function globalSetup(_config: FullConfig) {
  const repoRoot = path.resolve(__dirname, '../../../..');
  const defaultEnvFile = path.resolve(repoRoot, 'configs/e2e.test.envvars');
  const envFile = process.env.E2E_ENV_FILE || defaultEnvFile;

  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  } else {
    console.warn(`[E2E setup] 未找到环境文件：${envFile}`);
  }

// 允许跳过数据库重置（用于快速测试）
  if (process.env.SKIP_DB_RESET === '1') {
    console.log('[E2E setup] Skipping database reset (SKIP_DB_RESET=1)');
    return;
  }

  // [2026-03-02 07:05:30] 安全保护：默认禁止在任何环境自动执行 reset，除非显式设置 E2E_DB_RESET_CMD
  if (!process.env.E2E_DB_RESET_CMD) {
    console.log('[E2E setup] No E2E_DB_RESET_CMD specified, skipping destructive database reset by default');
    return;
  }

  // [2026-03-02 07:05:30] 双重保护：检测到疑似生产连接时，强制禁止执行 reset
  const dbUrl = process.env.DATABASE_URL || '';
  const isNeonOrProd =
    dbUrl.includes('.neon.tech') ||
    dbUrl.includes('run.app') ||
    dbUrl.includes('amazonaws.com');
  if (isNeonOrProd) {
    console.warn('[E2E setup] 🚫 DATABASE_URL looks like a shared/production database, refusing to run reset');
    return;
  }

  const resetCommand = process.env.E2E_DB_RESET_CMD;
  console.log(`[E2E setup] Running "${resetCommand}"`);
  try {
    execSync(resetCommand, {
      cwd: repoRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
      },
    });
  } catch (error) {
    console.warn('[E2E setup] Database reset failed, continuing anyway:', error);
    // 不抛出错误，允许测试继续运行
  }
}

export default globalSetup;

