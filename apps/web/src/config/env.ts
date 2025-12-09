/**
 * Environment Configuration
 * [2025-12-09] 统一环境变量管理，强校验，禁止隐式回退
 * 
 * 原则：
 * 1. 生产环境必须配置环境变量，不允许 localhost
 * 2. 开发环境允许 localhost 作为默认值
 * 3. 构建时允许默认值，运行时严格检查
 * 4. 禁止隐式回退到 /api，必须明确配置
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isBuildTime = !!process.env.NEXT_PHASE;
const isProduction = !isDevelopment && !isBuildTime;

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
 * 获取前端 API 基础 URL
 * [2025-12-09] 用于浏览器环境的 API 请求
 * 
 * 优先级：
 * 1. NEXT_PUBLIC_API_URL（前端环境变量，构建时内联）
 * 2. 浏览器环境检测（生产环境使用相对路径 /api）
 * 3. 开发环境回退到 localhost:3001/api
 */
export function getFrontendApiBaseUrl(): string {
  // 优先使用环境变量
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (envUrl) {
    // [2025-12-09] 修复：在浏览器环境中，如果检测到 localhost，自动回退到相对路径
    // 这是因为 NEXT_PUBLIC_* 变量在构建时内联，如果构建时未设置正确的值，就会使用 localhost
    // 在浏览器环境中，我们可以安全地回退到相对路径，通过 Next.js API 路由代理
    if (typeof window !== 'undefined' && isProduction && containsLocalhost(envUrl)) {
      console.warn('[Env Config] ⚠️ 检测到 localhost API 地址，自动回退到相对路径 /api');
      console.warn('[Env Config] 提示：下次部署时请在构建时设置正确的 NEXT_PUBLIC_API_URL 环境变量');
      return '/api';
    }
    
    // 服务端环境（SSR）：如果检测到 localhost，抛出错误（因为服务端需要知道真实的后端地址）
    if (typeof window === 'undefined' && isProduction && containsLocalhost(envUrl)) {
      const errorMsg = `生产环境 API 配置错误：NEXT_PUBLIC_API_URL 包含 localhost (${envUrl})。请设置正确的生产环境 API 服务器地址。`;
      console.error('[Env Config] ❌', errorMsg);
      throw new Error(errorMsg);
    }
    
    return normalizeApiUrl(envUrl);
  }
  
  // 浏览器环境：根据当前域名决定
  if (typeof window !== 'undefined' && window.location) {
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
    
    // 开发环境且是 localhost，直接指向后端服务器
    if (isLocalhost && isDevelopment) {
      return 'http://localhost:3001/api';
    }
    
    // 生产环境：统一使用相对路径，通过 Next.js API 路由代理
    if (isProduction) {
      if (isLocalhost) {
        throw new Error('生产环境不应在 localhost 上运行。请检查部署配置。');
      }
      // [2025-12-09] 生产环境统一使用相对路径，通过 Next.js API 路由代理
      return '/api';
    }
    
    // 开发环境其他情况，使用同源 URL
    return normalizeApiUrl(window.location.origin);
  }
  
  // SSR/构建时：检查部署 URL
  const deployUrl = process.env.DEPLOY_URL || process.env.URL;
  if (deployUrl) {
    return normalizeApiUrl(deployUrl);
  }
  
  // 生产环境运行时：必须配置环境变量
  if (isProduction) {
    const errorMsg = '生产环境未配置 API 地址环境变量。请设置 NEXT_PUBLIC_API_URL 或 NEXT_PUBLIC_API_BASE_URL。';
    console.error('[Env Config] ❌', errorMsg);
    throw new Error(errorMsg);
  }
  
  // 开发环境或构建时：允许回退到 localhost
  if (isBuildTime) {
    console.warn('[Env Config] ⚠️ 构建时未配置 API 地址，使用默认值（运行时需要配置环境变量）: http://localhost:3001/api');
  } else {
    console.warn('[Env Config] ⚠️ 开发环境未配置 API 地址，使用默认值: http://localhost:3001/api');
  }
  return 'http://localhost:3001/api';
}

/**
 * 获取后端 API 基础 URL
 * [2025-12-09] 用于 Next.js API 路由代理到后端
 * 
 * 优先级：
 * 1. NEXT_PUBLIC_API_URL（前端环境变量）
 * 2. API_BASE_URL（服务器端环境变量）
 * 3. NEXT_PUBLIC_API_BASE_URL（备选前端变量）
 * 4. 生产环境运行时：必须配置，不允许回退
 * 5. 开发环境或构建时：允许回退到 localhost:3001/api
 */
export function getBackendApiBaseUrl(): string {
  // 优先使用 NEXT_PUBLIC_API_URL
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (publicApiUrl) {
    if (isProduction && containsLocalhost(publicApiUrl)) {
      const errorMsg = `生产环境 API 配置错误：NEXT_PUBLIC_API_URL 包含 localhost (${publicApiUrl})。请设置正确的生产环境 API 服务器地址。`;
      console.error('[Env Config] ❌', errorMsg);
      throw new Error(errorMsg);
    }
    const url = publicApiUrl.replace(/\/$/, '');
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  // 回退到 API_BASE_URL（服务器端环境变量）
  const apiBaseUrl = process.env.API_BASE_URL;
  if (apiBaseUrl) {
    if (isProduction && containsLocalhost(apiBaseUrl)) {
      const errorMsg = `生产环境 API 配置错误：API_BASE_URL 包含 localhost (${apiBaseUrl})。请设置正确的生产环境 API 服务器地址。`;
      console.error('[Env Config] ❌', errorMsg);
      throw new Error(errorMsg);
    }
    const url = apiBaseUrl.replace(/\/$/, '');
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  // 回退到 NEXT_PUBLIC_API_BASE_URL
  const publicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (publicApiBaseUrl) {
    if (isProduction && containsLocalhost(publicApiBaseUrl)) {
      const errorMsg = `生产环境 API 配置错误：NEXT_PUBLIC_API_BASE_URL 包含 localhost (${publicApiBaseUrl})。请设置正确的生产环境 API 服务器地址。`;
      console.error('[Env Config] ❌', errorMsg);
      throw new Error(errorMsg);
    }
    const url = publicApiBaseUrl.replace(/\/$/, '');
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  // 生产环境运行时：必须配置环境变量
  if (isProduction) {
    const errorMsg = '生产环境未配置 API 地址环境变量。请设置 NEXT_PUBLIC_API_URL、API_BASE_URL 或 NEXT_PUBLIC_API_BASE_URL。';
    console.error('[Env Config] ❌', errorMsg);
    console.error('[Env Config] 当前环境变量:', {
      NEXT_PUBLIC_API_URL: publicApiUrl || '未设置',
      API_BASE_URL: apiBaseUrl || '未设置',
      NEXT_PUBLIC_API_BASE_URL: publicApiBaseUrl || '未设置',
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PHASE: process.env.NEXT_PHASE,
    });
    throw new Error(errorMsg);
  }
  
  // 开发环境或构建时：允许回退到 localhost
  const DEFAULT_API_BASE_DEV = 'http://localhost:3001/api';
  if (isBuildTime) {
    console.warn('[Env Config] ⚠️ 构建时未配置 API 地址，使用默认值（运行时需要配置环境变量）:', DEFAULT_API_BASE_DEV);
  } else {
    console.warn('[Env Config] ⚠️ 开发环境未配置 API 地址，使用默认值:', DEFAULT_API_BASE_DEV);
  }
  return DEFAULT_API_BASE_DEV;
}

/**
 * 验证环境变量配置
 * [2025-12-09] 在应用启动时调用，确保配置正确
 */
export function validateEnvConfig(): void {
  try {
    if (typeof window === 'undefined') {
      // 服务端：验证后端 API URL
      getBackendApiBaseUrl();
    } else {
      // 客户端：验证前端 API URL
      getFrontendApiBaseUrl();
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

