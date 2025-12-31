/**
 * 统一错误类型和错误码定义
* 创建统一错误处理规范
 */

/**
 * 错误码枚举
* 定义标准错误码，便于前端和后端统一处理
 */
export enum ErrorCode {
  // 验证错误 (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // 认证错误 (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // 权限错误 (403)
  FORBIDDEN = 'FORBIDDEN',
  
  // 资源不存在 (404)
  NOT_FOUND = 'NOT_FOUND',
  
  // 冲突错误 (409)
  CONFLICT = 'CONFLICT',
  
  // 代理层错误 (5xx)
  UPSTREAM_TIMEOUT = 'UPSTREAM_TIMEOUT',
  UPSTREAM_500 = 'UPSTREAM_500',
  PROXY_ERROR = 'PROXY_ERROR',
  
  // 网络错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // 未知错误
  UNKNOWN = 'UNKNOWN',
}

/**
 * 标准错误响应结构
* 统一错误响应格式，包含错误码、消息和追踪ID
 */
export interface StandardErrorResponse {
  error: {
    code: ErrorCode | string;
    message: string;
    details?: string | Record<string, unknown>;
  };
  traceId: string;
  timestamp?: string;
}

/**
 * 创建标准错误响应
* 辅助函数，用于创建标准化的错误响应
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  traceId: string,
  details?: string | Record<string, unknown>
): StandardErrorResponse {
  return {
    error: {
      code,
      message,
      ...(details && { details }),
    },
    traceId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 生成追踪ID
* 生成唯一的请求追踪ID，用于日志关联
 */
export function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
