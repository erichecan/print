/**
 * Environment Variables Validation
* 环境变量校验工具，确保必需的变量存在
 * 
 * 用途：
 * - 在应用启动时校验必需的环境变量
 * - 提供清晰的错误信息
 * - 在开发环境抛出错误，在生产环境记录警告
 */

interface EnvConfig {
  required?: string[];
  optional?: string[];
  defaults?: Record<string, string>;
}

class EnvValidationError extends Error {
  missing: string[];

  constructor(message: string, missing: string[]) {
    super(message);
    this.name = 'EnvValidationError';
    this.missing = missing;
  }
}

/**
 * 验证环境变量
 * 
 * @param config - 配置对象
 * @throws {EnvValidationError} 如果必需变量缺失（仅在开发环境）
 */
export function validateEnv(config: EnvConfig = {}): void {
  const { required = [], optional = [], defaults = {} } = config;

  // 应用默认值
  for (const [key, value] of Object.entries(defaults)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  // 检查必需变量
  const missing: string[] = [];
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}`;
    
    // 在开发环境抛出错误
    if (process.env.NODE_ENV === 'development') {
      throw new EnvValidationError(message, missing);
    }

    // 在生产环境记录警告
    console.error('[ENV]', message);
    console.error('[ENV] Missing variables:', missing);
    console.error('[ENV] This may cause runtime errors. Please check your environment configuration.');
  }

  // 记录可选变量状态（仅开发环境）
  if (process.env.NODE_ENV === 'development' && optional.length > 0) {
    const missingOptional = optional.filter(key => !process.env[key]);
    if (missingOptional.length > 0) {
      console.warn('[ENV] Optional variables not set:', missingOptional);
    }
  }
}

/**
 * 获取环境变量（带类型转换和默认值）
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set and no default value provided`);
  }
  return value;
}

/**
 * 获取布尔环境变量
 */
export function getEnvBool(key: string, defaultValue = false): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * 获取数字环境变量
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set and no default value provided`);
  }
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} is not a valid number: ${value}`);
  }
  return num;
}

/**
 * 初始化环境变量校验
 * 在应用启动时调用
 */
export function initEnv(): void {
  // 根据环境校验不同的变量
  const isServer = typeof window === 'undefined';
  const isProduction = process.env.NODE_ENV === 'production';

  if (isServer) {
    // 服务端必需变量
    validateEnv({
      required: [
        // 可以根据实际情况添加
        // 'DATABASE_URL',
        // 'API_BASE_URL',
      ],
      optional: [
        'NEXT_PUBLIC_API_URL',
        'API_BASE_URL',
      ],
    });
  }

  // 客户端公共变量（可选）
  if (!isServer) {
    // 客户端变量通常以 NEXT_PUBLIC_ 开头
    // 这里可以添加客户端特定的校验
  }

  // 生产环境额外检查
  if (isProduction) {
    // 生产环境特定的校验
    const criticalVars = [
      'NEXT_PUBLIC_API_URL',
    ];

    const missingCritical = criticalVars.filter(key => !process.env[key]);
    if (missingCritical.length > 0) {
      console.error('[ENV] Production environment missing critical variables:', missingCritical);
    }
  }
}

