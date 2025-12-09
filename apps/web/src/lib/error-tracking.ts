/**
 * Error Tracking and Digest Association
 * [2025-12-09 14:45:00] 错误追踪工具，关联 digest 到服务器日志
 * 
 * 用途：
 * - 在生产环境生成 traceId 并关联 digest
 * - 提供日志查询命令和链接
 * - 统一错误日志格式
 */

export interface ErrorContext {
  digest?: string;
  traceId?: string;
  path?: string;
  method?: string;
  timestamp?: string;
  userAgent?: string;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

/**
 * 生成唯一的 traceId
 */
function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `trace-${timestamp}-${random}`;
}

/**
 * 记录错误到服务器日志（带 digest 和 traceId）
 * 
 * @param error - 错误对象
 * @param context - 上下文信息
 * @returns traceId
 */
export function logServerError(error: Error & { digest?: string }, context: Partial<ErrorContext> = {}): string {
  const traceId = context.traceId || generateTraceId();
  const timestamp = new Date().toISOString();

  const errorContext: ErrorContext = {
    digest: error.digest,
    traceId,
    timestamp,
    path: context.path,
    method: context.method,
    userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent : undefined,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...context,
  };

  // 在服务器端记录详细日志
  if (typeof window === 'undefined') {
    console.error('[Server Error]', JSON.stringify(errorContext, null, 2));
  } else {
    // 客户端也可以记录（但不会包含敏感信息）
    console.error('[Client Error]', {
      digest: error.digest,
      traceId,
      message: error.message,
    });
  }

  return traceId;
}

/**
 * 获取 GCP Cloud Logging 查询命令
 * 
 * @param digest - 错误 digest
 * @param traceId - 追踪 ID
 * @param timeRange - 时间范围（小时）
 * @returns 查询命令
 */
export function getGcpLogQuery(digest?: string, traceId?: string, timeRange = 1): string {
  const serviceName = 'print-main-frontend';
  const projectId = 'moonlit-gamma-479502-r6';
  
  const conditions: string[] = [
    `resource.type="cloud_run_revision"`,
    `resource.labels.service_name="${serviceName}"`,
  ];

  if (digest) {
    conditions.push(`jsonPayload.digest="${digest}"`);
  }

  if (traceId) {
    conditions.push(`jsonPayload.traceId="${traceId}"`);
  }

  const filter = conditions.join(' AND ');

  return `gcloud logging read "${filter}" --limit=50 --format=json --project=${projectId}`;
}

/**
 * 获取 GCP Cloud Logging 控制台链接
 * 
 * @param digest - 错误 digest
 * @param traceId - 追踪 ID
 * @returns 控制台链接
 */
export function getGcpLogConsoleLink(digest?: string, traceId?: string): string {
  const serviceName = 'print-main-frontend';
  const projectId = 'moonlit-gamma-479502-r6';
  
  const params = new URLSearchParams({
    project: projectId,
    resource: 'cloud_run_revision',
    'labels.service_name': serviceName,
  });

  if (digest) {
    params.append('advancedFilter', `jsonPayload.digest="${digest}"`);
  }

  if (traceId) {
    params.append('advancedFilter', `jsonPayload.traceId="${traceId}"`);
  }

  return `https://console.cloud.google.com/logs/query?${params.toString()}`;
}

/**
 * 在错误页面显示日志查询信息
 */
export function getErrorLogInfo(error: Error & { digest?: string }, traceId?: string): {
  digest?: string;
  traceId?: string;
  queryCommand?: string;
  consoleLink?: string;
} {
  const info: ReturnType<typeof getErrorLogInfo> = {};

  if (error.digest) {
    info.digest = error.digest;
  }

  if (traceId) {
    info.traceId = traceId;
    info.queryCommand = getGcpLogQuery(error.digest, traceId);
    info.consoleLink = getGcpLogConsoleLink(error.digest, traceId);
  }

  return info;
}

