#!/usr/bin/env node
/**
 * Environment Variable Validation Script
 * [2025-12-10] 在构建前校验必需环境变量与非法值
 * 
 * 用法: node scripts/check-env.mjs
 */

const isProduction = process.env.NODE_ENV === 'production';
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

// 必需的环境变量（生产环境）
const REQUIRED_VARS = {
  // API 配置
  NEXT_PUBLIC_API_URL: {
    required: isProduction || isBuildTime,
    description: '前端 API 基础 URL（不包含 /api 后缀）',
    validate: (value) => {
      if (!value || value.trim() === '') {
        return { valid: false, error: '不能为空' };
      }
      if (isProduction && (value.includes('localhost') || value.includes('127.0.0.1'))) {
        return { valid: false, error: '生产环境不能包含 localhost' };
      }
      return { valid: true };
    },
  },
  // Stripe 配置
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: {
    required: isProduction || isBuildTime,
    description: 'Stripe Publishable Key（客户端）',
    validate: (value) => {
      if (!value || value.trim() === '') {
        return { valid: false, error: '不能为空' };
      }
      if (!value.startsWith('pk_')) {
        return { valid: false, error: '必须以 pk_ 开头' };
      }
      return { valid: true };
    },
  },
  STRIPE_SECRET_KEY: {
    required: isProduction || isBuildTime,
    description: 'Stripe Secret Key（服务端）',
    validate: (value) => {
      if (!value || value.trim() === '') {
        return { valid: false, error: '不能为空' };
      }
      if (!value.startsWith('sk_')) {
        return { valid: false, error: '必须以 sk_ 开头' };
      }
      return { valid: true };
    },
  },
};

// 可选但建议配置的环境变量
const RECOMMENDED_VARS = {
  API_BASE_URL: {
    description: '后端 API 基础 URL（服务端，备选）',
    validate: (value) => {
      if (value && isProduction && (value.includes('localhost') || value.includes('127.0.0.1'))) {
        return { valid: false, error: '生产环境不能包含 localhost' };
      }
      return { valid: true };
    },
  },
};

function validateEnvVars() {
  const errors = [];
  const warnings = [];

  // 检查必需变量
  for (const [varName, config] of Object.entries(REQUIRED_VARS)) {
    const value = process.env[varName];
    
    if (config.required) {
      if (!value || value.trim() === '') {
        errors.push({
          variable: varName,
          error: `必需环境变量未设置: ${varName}`,
          description: config.description,
          suggestion: `请设置 ${varName} 环境变量`,
        });
      } else {
        const validation = config.validate(value);
        if (!validation.valid) {
          errors.push({
            variable: varName,
            error: `环境变量 ${varName} 值无效: ${validation.error}`,
            description: config.description,
            currentValue: value.substring(0, 20) + (value.length > 20 ? '...' : ''),
            suggestion: `请设置正确的 ${varName} 值`,
          });
        }
      }
    } else {
      // 非必需但已设置，进行验证
      if (value) {
        const validation = config.validate(value);
        if (!validation.valid) {
          warnings.push({
            variable: varName,
            warning: `环境变量 ${varName} 值可能无效: ${validation.error}`,
            description: config.description,
            currentValue: value.substring(0, 20) + (value.length > 20 ? '...' : ''),
          });
        }
      }
    }
  }

  // 检查推荐变量
  for (const [varName, config] of Object.entries(RECOMMENDED_VARS)) {
    const value = process.env[varName];
    if (value) {
      const validation = config.validate(value);
      if (!validation.valid) {
        warnings.push({
          variable: varName,
          warning: `环境变量 ${varName} 值可能无效: ${validation.error}`,
          description: config.description,
          currentValue: value.substring(0, 20) + (value.length > 20 ? '...' : ''),
        });
      }
    }
  }

  // 检查硬编码的 localhost（在非开发环境）
  if (isProduction || isBuildTime) {
    const allVars = { ...REQUIRED_VARS, ...RECOMMENDED_VARS };
    for (const [varName] of Object.entries(allVars)) {
      const value = process.env[varName];
      if (value && (value.includes('localhost') || value.includes('127.0.0.1'))) {
        errors.push({
          variable: varName,
          error: `生产环境 ${varName} 包含 localhost`,
          description: allVars[varName].description,
          currentValue: value,
          suggestion: `请设置正确的生产环境 ${varName} 值（不包含 localhost）`,
        });
      }
    }
  }

  return { errors, warnings };
}

// 主函数
function main() {
  console.log('[Env Check] 开始环境变量校验...');
  console.log(`[Env Check] 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Env Check] 构建阶段: ${isBuildTime ? '是' : '否'}`);
  console.log(`[Env Check] 生产环境: ${isProduction ? '是' : '否'}`);
  console.log('');

  const { errors, warnings } = validateEnvVars();

  // 输出警告
  if (warnings.length > 0) {
    console.warn('[Env Check] ⚠️ 发现警告:');
    warnings.forEach((w) => {
      console.warn(`  - ${w.variable}: ${w.warning}`);
      console.warn(`    描述: ${w.description}`);
      if (w.currentValue) {
        console.warn(`    当前值: ${w.currentValue}`);
      }
    });
    console.log('');
  }

  // 输出错误
  if (errors.length > 0) {
    console.error('[Env Check] ❌ 发现错误:');
    errors.forEach((e) => {
      console.error(`  - ${e.variable}: ${e.error}`);
      console.error(`    描述: ${e.description}`);
      if (e.currentValue) {
        console.error(`    当前值: ${e.currentValue}`);
      }
      console.error(`    建议: ${e.suggestion}`);
    });
    console.log('');
    console.error('[Env Check] ❌ 环境变量校验失败，构建将被阻止');
    process.exit(1);
  }

  console.log('[Env Check] ✅ 环境变量校验通过');
  process.exit(0);
}

// 执行
main();

