/**
 * Environment Variable Validation
* 启动时环境变量校验，缺失即 fail-fast
 */
const isDevelopment = process.env.NODE_ENV === 'development';
const isBuildTime = !!process.env.NEXT_PHASE;
const isProduction = !isDevelopment && !isBuildTime;

/**
 * 必需的环境变量列表
 */
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_API_URL', // 后端 API URL（前端构建时内联）
];

/**
 * 可选但推荐的环境变量
 */
const RECOMMENDED_ENV_VARS = [
  'API_BASE_URL', // 服务器端 API URL（运行时使用）
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', // Stripe 公钥
];

/**
 * 验证环境变量
* 在生产环境启动时校验必需变量
* 增强：添加更详细的错误信息和日志
 */
export function validateRequiredEnvVars(): void {
  const traceId = `env-check-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = new Date().toISOString();
  
// 增强：记录校验开始
  console.debug('[Env Check] Starting environment variable validation', {
    traceId,
    timestamp,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PHASE: process.env.NEXT_PHASE,
    isProduction,
    isBuildTime,
  });
  
  const missing: string[] = [];
  const warnings: string[] = [];

  // 检查必需变量
  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
      console.debug('[Env Check] Missing required env var', { traceId, varName });
    } else {
// 增强：记录已设置的变量（不记录值，只记录状态）
      console.debug('[Env Check] Required env var found', { 
        traceId, 
        varName,
        valueLength: value.length,
        // 不记录完整值，只记录是否包含 localhost（用于调试）
        containsLocalhost: value.includes('localhost') || value.includes('127.0.0.1'),
      });
    }
  }

  // 检查推荐变量（仅警告）
  for (const varName of RECOMMENDED_ENV_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      warnings.push(varName);
      console.debug('[Env Check] Missing recommended env var', { traceId, varName });
    }
  }

  // 生产环境：缺失必需变量时抛出错误
  if (isProduction && missing.length > 0) {
    const errorMsg = `❌ 生产环境缺少必需的环境变量: ${missing.join(', ')}\n` +
      `请设置这些环境变量后再启动应用。\n` +
      `当前环境: NODE_ENV=${process.env.NODE_ENV}, NEXT_PHASE=${process.env.NEXT_PHASE || '未设置'}`;
    console.error('[Env Check] ❌ Validation failed', {
      traceId,
      timestamp,
      missing,
      error: errorMsg,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PHASE: process.env.NEXT_PHASE,
      },
    });
    throw new Error(errorMsg);
  }

  // 开发环境：仅警告
  if (isDevelopment && missing.length > 0) {
    console.warn('[Env Check] ⚠️ 开发环境缺少环境变量（将使用默认值）:', missing.join(', '), {
      traceId,
      timestamp,
    });
  }

  // 警告推荐变量缺失
  if (warnings.length > 0) {
    console.warn('[Env Check] ⚠️ 推荐的环境变量未设置:', warnings.join(', '), {
      traceId,
      timestamp,
    });
  }

  // 成功日志
  if (missing.length === 0) {
    console.info('[Env Check] ✅ 所有必需的环境变量已配置', {
      traceId,
      timestamp,
      checkedVars: REQUIRED_ENV_VARS.length,
    });
  }
}

/**
 * 在应用启动时调用
 */
if (typeof window === 'undefined') {
  // 仅在服务端执行
  try {
    validateRequiredEnvVars();
  } catch (error) {
    // 生产环境：阻止启动
    if (isProduction) {
      console.error('[Env Check] ❌ 环境变量校验失败，应用无法启动');
      throw error;
    }
    // 开发环境：仅警告
    console.warn('[Env Check] ⚠️ 环境变量校验失败（开发环境继续运行）:', error);
  }
}
