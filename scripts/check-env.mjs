/**
 * 构建前检查必需 env
 * [2025-01-30 23:00:00] Design Lab 4.0: 非法值直接 fail
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

function checkEnvVar(name, value, isProduction) {
  if (!value || value.trim() === '') {
    if (isProduction) {
      console.error(`❌ 生产环境环境变量缺失: ${name}`);
      process.exit(1);
    } else {
      console.warn(`⚠️ 开发环境环境变量缺失: ${name}`);
    }
    return false;
  }

  if (isProduction && (value.includes('localhost') || value.includes('127.0.0.1'))) {
    console.error(`❌ 生产环境环境变量非法: ${name} 包含 localhost (${value})`);
    process.exit(1);
  }

  return true;
}

function main() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.log('🔍 检查环境变量...');
  console.log(`环境: ${isProduction ? '生产' : '开发'}`);

  // 检查必需的环境变量
  const requiredVars = [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_API_BASE_URL',
  ];

  let hasError = false;

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!checkEnvVar(varName, value, isProduction)) {
      hasError = true;
    }
  }

  // 检查 Stripe（生产环境必需）
  if (isProduction) {
    const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!checkEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', stripeKey, isProduction)) {
      hasError = true;
    }
  }

  if (hasError && isProduction) {
    console.error('❌ 环境变量检查失败，构建终止');
    process.exit(1);
  }

  console.log('✅ 环境变量检查通过');
}

main();
