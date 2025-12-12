/**
 * Server Error Telemetry
 * [2025-01-27 18:10:00] 服务端错误上报和追踪
 */
import { generateTraceId } from '@/shared/errors';

export interface ServerErrorPayload {
  digest?: string;
  traceId?: string;
  requestId?: string;
  route: string;
  message?: string;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
  context?: Record<string, any>;
}

/**
 * 上报服务端错误到遥测端点
 * [2025-01-27 18:10:00]
 */
export async function reportServerError(payload: ServerErrorPayload): Promise<void> {
  const traceId = payload.traceId || generateTraceId();
  const timestamp = new Date().toISOString();
  
  try {
    // [2025-01-27 18:10:00] 在生产环境，可以上报到遥测服务
    // 目前先记录到服务器日志，后续可以集成 Sentry 或其他服务
    const errorLog = {
      ...payload,
      traceId,
      timestamp,
      environment: process.env.NODE_ENV,
    };

    // 记录到服务器日志（Cloud Run 会自动收集）
    console.error('[Server Error Telemetry]', JSON.stringify(errorLog, null, 2));

    // 如果有遥测端点配置，可以上报
    const telemetryEndpoint = process.env.TELEMETRY_ENDPOINT;
    if (telemetryEndpoint && process.env.NODE_ENV === 'production') {
      try {
        await fetch(telemetryEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': traceId,
          },
          body: JSON.stringify(errorLog),
        });
      } catch (fetchError) {
        // 静默失败，不影响主流程
        console.warn('[Telemetry] Failed to report error', { traceId, error: fetchError });
      }
    }
  } catch (error) {
    // 静默失败，不影响主流程
    console.warn('[Telemetry] Error reporting failed', { traceId, error });
  }
}
