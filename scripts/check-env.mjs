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

  // [2025-01-30 18:10:00] 检查必需的环境变量
  const requiredVars = [
    'NEXT_PUBLIC_API_URL',
  ];

  let hasError = false;

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!checkEnvVar(varName, value, isProduction)) {
      hasError = true;
    }
  }

  // [2025-01-30 18:10:00] 检查 Stripe（生产环境必需，并验证格式）
  if (isProduction) {
    const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!stripeKey || stripeKey.trim() === '') {
      console.error('❌ 生产环境环境变量缺失: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
      console.error('   提示: 确保在构建时传入 --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...');
      hasError = true;
    } else if (!stripeKey.startsWith('pk_test_') && !stripeKey.startsWith('pk_live_')) {
      console.error(`❌ Stripe key 格式错误: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 必须以 pk_test_ 或 pk_live_ 开头`);
      console.error(`   当前值: ${stripeKey.substring(0, 20)}...`);
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
