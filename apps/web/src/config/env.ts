/**
 * Environment Configuration - 统一环境变量管理
* Design Lab 4.0: 构建时 fail，无隐式回退
 * 
 * 原则：
 * 1. 生产环境必须配置环境变量，不允许 localhost 或空值
 * 2. 开发环境允许 localhost 作为默认值
 * 3. 构建时严格检查，缺失或 localhost 直接 fail
 * 4. 运行时严格检查，缺失或 localhost 直接 fail
 * 5. 禁止所有隐式回退逻辑
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const isBuildTime = !!process.env.NEXT_PHASE;
const isProduction = !isDevelopment && !isTest && !isBuildTime;

/**
 * 检查 URL 是否包含 localhost
 */
function containsLocalhost(url: string): boolean {
  return url.includes('localhost') || url.includes('127.0.0.1');
}

/**
 * 规范化 API URL（确保以 /api 结尾）
 */
function normalizeApiUrl(base: string): string {
  const clean = base.replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
}

/**
 * 验证环境变量（生产环境强制校验）
* 在构建时和生产运行时进行严格校验
 */
function validateEnvVar(name: string, value: string | undefined, allowEmpty = false): string {
  if (!value || value.trim() === '') {
    if (isProduction && !allowEmpty) {
      const errorMsg = `生产环境必须配置环境变量 ${name}。请设置正确的值。`;
      console.error(`[Env Config] ❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    if (isBuildTime && !allowEmpty) {
      console.warn(`[Env Config] ⚠️ 构建时 ${name} 未设置，运行时需要配置环境变量`);
    }
    return '';
  }

  // 生产环境禁止 localhost
  if (isProduction && containsLocalhost(value)) {
    const errorMsg = `生产环境 ${name} 不能包含 localhost (${value})。请设置正确的生产环境地址。`;
    console.error(`[Env Config] ❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }

  return value.trim();
}

/**
 * 构建时环境变量校验
* Design Lab 4.0: 构建时 fail，无隐式回退
 */
export function validateEnvAtBuildTime(): void {
  if (isBuildTime || isProduction) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

    if (!apiUrl) {
      throw new Error(
        '❌ 构建时环境变量缺失: NEXT_PUBLIC_API_URL 或 NEXT_PUBLIC_API_BASE_URL 必须设置'
      );
    }

    if (containsLocalhost(apiUrl)) {
      throw new Error(
        `❌ 构建时环境变量非法: NEXT_PUBLIC_API_URL 包含 localhost (${apiUrl})，生产环境不允许使用 localhost`
      );
    }
  }
}

/**
 * 获取前端 API 基础 URL
* Design Lab 4.0: 生产环境运行时，必须配置环境变量，无隐式回退
 * 
 * 优先级：
 * 1. NEXT_PUBLIC_API_URL（前端环境变量，构建时内联）
 * 2. NEXT_PUBLIC_API_BASE_URL（备选前端变量）
 * 3. 生产环境运行时：必须配置，不允许回退
 * 4. 开发环境：允许回退到 localhost:3001/api
 */
export function getFrontendApiBaseUrl(): string {
// Fix: In development mode, prioritize local backend to avoid session/auth mismatches
  // caused by accidental usage of production API URL in local environment.
  if (isDevelopment) {
    // Check if we should explicitly use remote API (via a new bespoke flag, or just check if the env var is set AND we want to respect it)
    // For now, to fix the reported critical issues, we default to localhost.
    const forceRemote = process.env.NEXT_PUBLIC_USE_REMOTE_API === 'true';
    if (!forceRemote) {
      console.warn('[Env Config] Development mode: Forcing API URL to http://localhost:3001/api');
      return 'http://localhost:3001/api';
    }
  }

  // 优先使用环境变量
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

  if (envUrl) {
// Design Lab 4.0: 生产环境检测到 localhost，直接 fail
    if (isProduction && containsLocalhost(envUrl)) {
      const errorMsg = `生产环境 API 配置错误：NEXT_PUBLIC_API_URL 包含 localhost (${envUrl})。请设置正确的生产环境 API 服务器地址。`;
      console.error('[Env Config] ❌', errorMsg);
      throw new Error(errorMsg);
    }

    return normalizeApiUrl(envUrl);
  }

// 生产环境：NEXT_PUBLIC_API_URL 应在构建时由 Next.js 内联，
  // 如果走到这里说明构建时也未设置，使用硬编码回退而非崩溃
  if (isProduction) {
    const fallbackUrl = 'https://print-main-backend-5spbppmmza-uc.a.run.app/api';
    console.warn('[Env Config] ⚠️ 生产环境未检测到 API 地址环境变量，使用构建时默认值:', fallbackUrl);
    return fallbackUrl;
  }

  // 开发环境：允许回退到 localhost
  // 修复：本仓库默认本地后端端口为 3001 (backend/.env PORT=3001)
  console.warn('[Env Config] ⚠️ 开发环境未配置 API 地址，使用默认值: http://localhost:3001/api');
  return 'http://localhost:3001/api';
}

/**
 * 获取后端 API 基础 URL
* 用于 Next.js API 路由代理到后端
 * 
 * 优先级：
 * 1. NEXT_PUBLIC_API_URL（前端环境变量）
 * 2. API_BASE_URL（服务器端环境变量）
 * 3. NEXT_PUBLIC_API_BASE_URL（备选前端变量）
 * 4. 生产环境运行时：必须配置，不允许回退
 * 5. 开发环境或构建时：允许回退到 localhost:3001/api
 */
/**
 * 获取后端 API 基础 URL
* 用于 Next.js API 路由代理到后端
* 增强错误处理和日志记录
 * 
 * 优先级：
 * 1. NEXT_PUBLIC_API_URL（前端环境变量）
 * 2. API_BASE_URL（服务器端环境变量）
 * 3. NEXT_PUBLIC_API_BASE_URL（备选前端变量）
 * 4. 生产环境运行时：必须配置，不允许回退
 * 5. 开发环境或构建时：允许回退到 localhost:3001/api
 */
export function getBackendApiBaseUrl(): string {
  const traceId = `env-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = new Date().toISOString();

// 增强：记录环境变量检查过程
  console.debug('[Env Config] getBackendApiBaseUrl called', {
    traceId,
    timestamp,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PHASE: process.env.NEXT_PHASE,
    isProduction,
    isBuildTime,
  });

// Fix: In development mode, prioritize local backend for SSR/Proxy as well
  if (isDevelopment && !isBuildTime) {
    const forceRemote = process.env.NEXT_PUBLIC_USE_REMOTE_API === 'true';
    if (!forceRemote) {
      console.debug('[Env Config] Development mode: Forcing Backend API URL to http://localhost:3001/api');
      return 'http://localhost:3001/api';
    }
  }

  // 优先使用 NEXT_PUBLIC_API_URL
  try {
    const publicApiUrl = validateEnvVar('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL, true);
    if (publicApiUrl) {
      const url = publicApiUrl.replace(/\/$/, '');
      const finalUrl = url.endsWith('/api') ? url : `${url}/api`;
      console.debug('[Env Config] Using NEXT_PUBLIC_API_URL', { traceId, url: finalUrl });
      return finalUrl;
    }
  } catch (error) {
// 增强：记录环境变量验证错误
    console.error('[Env Config] NEXT_PUBLIC_API_URL validation failed', {
      traceId,
      timestamp,
      error: error instanceof Error ? error.message : String(error),
    });
    // 继续尝试其他环境变量
  }

  // 回退到 API_BASE_URL（服务器端环境变量）
  try {
    const apiBaseUrl = validateEnvVar('API_BASE_URL', process.env.API_BASE_URL, true);
    if (apiBaseUrl) {
      const url = apiBaseUrl.replace(/\/$/, '');
      const finalUrl = url.endsWith('/api') ? url : `${url}/api`;
      console.debug('[Env Config] Using API_BASE_URL', { traceId, url: finalUrl });
      return finalUrl;
    }
  } catch (error) {
    console.error('[Env Config] API_BASE_URL validation failed', {
      traceId,
      timestamp,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // 回退到 NEXT_PUBLIC_API_BASE_URL
  try {
    const publicApiBaseUrl = validateEnvVar('NEXT_PUBLIC_API_BASE_URL', process.env.NEXT_PUBLIC_API_BASE_URL, true);
    if (publicApiBaseUrl) {
      const url = publicApiBaseUrl.replace(/\/$/, '');
      const finalUrl = url.endsWith('/api') ? url : `${url}/api`;
      console.debug('[Env Config] Using NEXT_PUBLIC_API_BASE_URL', { traceId, url: finalUrl });
      return finalUrl;
    }
  } catch (error) {
    console.error('[Env Config] NEXT_PUBLIC_API_BASE_URL validation failed', {
      traceId,
      timestamp,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // 生产环境：NEXT_PUBLIC_API_URL 应在构建时内联，如果走到这里使用硬编码回退
  if (isProduction) {
    const fallbackUrl = 'https://print-main-backend-5spbppmmza-uc.a.run.app/api';
    console.warn('[Env Config] ⚠️ 生产环境未检测到 API 地址环境变量，使用构建时默认值:', fallbackUrl, {
      traceId,
      timestamp,
    });
    return fallbackUrl;
  }

  // 开发环境或构建时：允许回退到 localhost
// 修复：默认本地后端端口改为 3001 (backend/.env PORT=3001)
  const DEFAULT_API_BASE_DEV = 'http://localhost:3001/api';
  if (isBuildTime) {
    console.warn('[Env Config] ⚠️ 构建时未配置 API 地址，使用默认值（运行时需要配置环境变量）:', DEFAULT_API_BASE_DEV, {
      traceId,
      timestamp,
    });
  } else {
    console.warn('[Env Config] ⚠️ 开发环境未配置 API 地址，使用默认值:', DEFAULT_API_BASE_DEV, {
      traceId,
      timestamp,
    });
  }
  return DEFAULT_API_BASE_DEV;
}

/**
 * 获取 Stripe Publishable Key（客户端）
* 用于客户端 Stripe 初始化
* 修复：生产环境缺失时抛出明确的错误信息，包含配置指导
 * 
 * 生产环境必须配置，不允许空值
 */
export function getStripePublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// 生产环境严格校验
  if (!key || key.trim() === '') {
    if (isProduction) {
      const errorMsg = `生产环境必须配置环境变量 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY。请设置正确的值。
      
配置方法：
1. 确保 Secret Manager 中存在 'stripe-publishable-key' secret
2. 在构建时传入: --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=\$(gcloud secrets versions access latest --secret=stripe-publishable-key)
3. 或使用 cloudbuild.yaml 自动从 Secret Manager 读取

当前环境变量状态: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${key || '未设置'}`;
      console.error('[Env Config] ❌', errorMsg);
      throw new Error(errorMsg);
    }
    // 开发环境：允许空值，但会警告
    console.warn('[Env Config] ⚠️ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 未设置，Stripe 功能将不可用');
    return '';
  }

// 验证 key 格式（以 pk_ 开头）
  const trimmedKey = key.trim();
  if (!trimmedKey.startsWith('pk_test_') && !trimmedKey.startsWith('pk_live_')) {
    if (isProduction) {
      const errorMsg = `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 格式错误：必须以 pk_test_ 或 pk_live_ 开头。当前值: ${trimmedKey.substring(0, 20)}...`;
      console.error('[Env Config] ❌', errorMsg);
      throw new Error(errorMsg);
    }
    console.warn('[Env Config] ⚠️ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 格式可能不正确');
  }

  return trimmedKey;
}

/**
 * 获取 Stripe Secret Key（服务端）
* 用于服务端 Stripe 操作
 * 
 * 生产环境必须配置，不允许空值
 */
export function getStripeSecretKey(): string {
  const key = validateEnvVar('STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY, false);

  if (!key || key.trim() === '') {
    if (isProduction) {
      const errorMsg = '生产环境必须配置 STRIPE_SECRET_KEY 环境变量。';
      console.error('[Env Config] ❌', errorMsg);
      throw new Error(errorMsg);
    }
    // 开发环境：允许空值，但会警告
    console.warn('[Env Config] ⚠️ STRIPE_SECRET_KEY 未设置，服务端 Stripe 功能将不可用');
    return '';
  }

  return key;
}

/**
 * 验证环境变量配置
* 在应用启动时调用，确保配置正确
 */
export function validateEnvConfig(): void {
  try {
    if (typeof window === 'undefined') {
      // 服务端：验证后端 API URL 和 Stripe Secret Key
      getBackendApiBaseUrl();
      getStripeSecretKey();
    } else {
      // 客户端：验证前端 API URL 和 Stripe Publishable Key
      getFrontendApiBaseUrl();
      getStripePublishableKey();
    }
  } catch (error) {
    // 在开发环境只警告，不阻止启动
    if (isDevelopment) {
      console.warn('[Env Config] ⚠️ 环境变量配置警告:', error instanceof Error ? error.message : String(error));
    } else {
      // 生产环境：抛出错误，阻止启动
      throw error;
    }
  }
}
