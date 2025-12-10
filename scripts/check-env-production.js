#!/usr/bin/env node
/**
 * Production Environment Variables Checker
 * [2025-01-30 12:00:00] 构建前检查必需的环境变量
 * 
 * 用途：
 * 1. 在生产构建前验证必需的环境变量
 * 2. 防止构建时使用错误的配置
 * 3. 提供清晰的错误提示
 * 
 * 使用方法：
 * node scripts/check-env-production.js
 */

const requiredVars = {
  // 前端必需变量
  frontend: [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  ],
  // 后端必需变量（如果同时构建后端）
  backend: [
    'DATABASE_URL',
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'FRONTEND_URL',
  ],
};

/**
 * 检查环境变量
 */
function checkEnvVars(envVars, context = '') {
  const missing = [];
  const invalid = [];
  
  for (const varName of envVars) {
    const value = process.env[varName];
    
    if (!value || value.trim() === '') {
      missing.push(varName);
    } else {
      // 检查是否包含 localhost（生产环境不允许）
      if (value.includes('localhost') || value.includes('127.0.0.1')) {
        invalid.push({
          name: varName,
          value: value.substring(0, 50) + (value.length > 50 ? '...' : ''),
          reason: '包含 localhost，生产环境不允许',
        });
      }
      
      // 特殊检查：Stripe key 格式
      if (varName === 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY' || varName === 'STRIPE_PUBLISHABLE_KEY') {
        if (!value.startsWith('pk_test_') && !value.startsWith('pk_live_')) {
          invalid.push({
            name: varName,
            value: value.substring(0, 20) + '...',
            reason: 'Stripe key 格式不正确，应以 pk_test_ 或 pk_live_ 开头',
          });
        }
      }
      
      // 特殊检查：Stripe secret key 格式
      if (varName === 'STRIPE_SECRET_KEY') {
        if (!value.startsWith('sk_test_') && !value.startsWith('sk_live_')) {
          invalid.push({
            name: varName,
            value: value.substring(0, 20) + '...',
            reason: 'Stripe secret key 格式不正确，应以 sk_test_ 或 sk_live_ 开头',
          });
        }
      }
    }
  }
  
  return { missing, invalid };
}

/**
 * 主函数
 */
function main() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isBuildTime = !!process.env.NEXT_PHASE || process.argv.includes('--build');
  
  // 只在生产构建时检查
  if (!isProduction && !isBuildTime && !process.argv.includes('--force')) {
    console.log('⚠️  非生产环境，跳过环境变量检查');
    console.log('   提示：使用 --force 强制检查，或设置 NODE_ENV=production');
    process.exit(0);
  }
  
  console.log('🔍 检查生产环境变量...\n');
  
  // 检查前端变量
  const frontendCheck = checkEnvVars(requiredVars.frontend, '前端');
  const backendCheck = checkEnvVars(requiredVars.backend, '后端');
  
  // 汇总结果
  const allMissing = [...frontendCheck.missing, ...backendCheck.missing];
  const allInvalid = [...frontendCheck.invalid, ...backendCheck.invalid];
  
  // 输出结果
  if (allMissing.length > 0) {
    console.error('❌ 缺失的环境变量:');
    allMissing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('');
  }
  
  if (allInvalid.length > 0) {
    console.error('❌ 无效的环境变量:');
    allInvalid.forEach(({ name, value, reason }) => {
      console.error(`   - ${name}`);
      console.error(`     值: ${value}`);
      console.error(`     原因: ${reason}`);
    });
    console.error('');
  }
  
  // 如果有错误，退出并返回错误码
  if (allMissing.length > 0 || allInvalid.length > 0) {
    console.error('💡 提示:');
    console.error('   1. 检查 .env.production 文件');
    console.error('   2. 检查 GCP Secret Manager 配置');
    console.error('   3. 检查 cloudbuild.yaml 中的环境变量传递');
    console.error('');
    process.exit(1);
  }
  
  console.log('✅ 所有必需的环境变量已正确配置\n');
  process.exit(0);
}

// 运行主函数
main();

