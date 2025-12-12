/**
 * Environment Variable Validation
 * [2025-01-27 18:30:00] 启动时环境变量校验，缺失即 fail-fast
 */
const isDevelopment = process.env.NODE_ENV === 'development';
const isBuildTime = !!process.env.NEXT_PHASE;
const isProduction = !isDevelopment && !isBuildTime;

/**
 * 必需的环境变量列表
 * [2025-01-27 18:30:00]
 */
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_API_URL', // 后端 API URL（前端构建时内联）
];

/**
 * 可选但推荐的环境变量
 * [2025-01-27 18:30:00]
 */
const RECOMMENDED_ENV_VARS = [
  'API_BASE_URL', // 服务器端 API URL（运行时使用）
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', // Stripe 公钥
];

/**
 * 验证环境变量
 * [2025-01-27 18:30:00] 在生产环境启动时校验必需变量
 */
export function validateRequiredEnvVars(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  // 检查必需变量
  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
    }
  }

  // 检查推荐变量（仅警告）
  for (const varName of RECOMMENDED_ENV_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      warnings.push(varName);
    }
  }

  // 生产环境：缺失必需变量时抛出错误
  if (isProduction && missing.length > 0) {
    const errorMsg = `❌ 生产环境缺少必需的环境变量: ${missing.join(', ')}\n` +
      `请设置这些环境变量后再启动应用。`;
    console.error('[Env Check]', errorMsg);
    throw new Error(errorMsg);
  }

  // 开发环境：仅警告
  if (isDevelopment && missing.length > 0) {
    console.warn('[Env Check] ⚠️ 开发环境缺少环境变量（将使用默认值）:', missing.join(', '));
  }

  // 警告推荐变量缺失
  if (warnings.length > 0) {
    console.warn('[Env Check] ⚠️ 推荐的环境变量未设置:', warnings.join(', '));
  }

  // 成功日志
  if (missing.length === 0) {
    console.info('[Env Check] ✅ 所有必需的环境变量已配置');
  }
}

/**
 * 在应用启动时调用
 * [2025-01-27 18:30:00]
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
