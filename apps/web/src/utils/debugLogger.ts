/**
 * Debug Logger - 统一调试日志工具
* 支持本地和生产环境的日志收集
 * 
 * 使用方式：
 * - 开发环境：日志发送到本地调试服务器 (http://127.0.0.1:7242/ingest/...)
 * - 生产环境：可通过环境变量 NEXT_PUBLIC_DEBUG_LOG_ENDPOINT 配置远程日志端点
 * - 生产环境：设置 NEXT_PUBLIC_ENABLE_DEBUG_LOGS=true 启用日志（默认关闭）
 * 
 * 环境变量配置：
 * - NEXT_PUBLIC_DEBUG_LOG_ENDPOINT: 日志服务器端点 URL（可选）
 *   - 本地开发：http://127.0.0.1:7242/ingest/ecff888f-84e6-491c-bcdb-63061d70b207
 *   - 生产环境：可以配置为您的日志收集服务 URL
 * - NEXT_PUBLIC_ENABLE_DEBUG_LOGS: 是否启用调试日志（'true' 或 'false'，默认 'false'）
 */

const DEBUG_LOG_ENDPOINT = process.env.NEXT_PUBLIC_DEBUG_LOG_ENDPOINT;
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const ENABLE_DEBUG_LOGS = process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS === 'true';

// 默认本地调试端点（仅在开发环境使用）
const DEFAULT_LOCAL_ENDPOINT = 'http://127.0.0.1:7242/ingest/ecff888f-84e6-491c-bcdb-63061d70b207';

interface DebugLogData {
  location: string;
  message: string;
  data?: any;
  timestamp?: number;
  sessionId?: string;
  runId?: string;
  hypothesisId?: string;
}

/**
 * 发送调试日志
* 支持本地和生产环境
 * 
 * 日志收集策略：
 * 1. 开发环境：始终启用，发送到本地端点或配置的端点
 * 2. 生产环境：仅在 ENABLE_DEBUG_LOGS=true 时启用，发送到配置的端点
 * 3. 如果没有配置端点，开发环境回退到 console.log
 */
export function debugLog(payload: DebugLogData): void {
  // 生产环境需要显式启用
  if (!IS_DEVELOPMENT && !ENABLE_DEBUG_LOGS) {
    return;
  }

  const logPayload = {
    ...payload,
    timestamp: payload.timestamp || Date.now(),
    sessionId: payload.sessionId || 'debug-session',
    runId: payload.runId || 'run1',
  };

  // 确定使用的端点
  const endpoint = DEBUG_LOG_ENDPOINT || (IS_DEVELOPMENT ? DEFAULT_LOCAL_ENDPOINT : null);

  // 如果配置了日志端点（或开发环境使用默认端点），发送到端点
  if (endpoint && typeof window !== 'undefined') {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logPayload),
    }).catch((error) => {
      // 如果发送失败，回退到控制台日志（仅在开发环境）
      if (IS_DEVELOPMENT) {
        console.warn('[Debug Logger] Failed to send log to endpoint, using console:', error);
        console.log('[Debug]', payload.message, payload.data);
      }
    });
  } else if (IS_DEVELOPMENT) {
    // 开发环境但没有配置端点，使用控制台
    console.log('[Debug]', payload.message, payload.data);
  }
  // 生产环境且未配置端点且未启用：静默失败（不输出日志）
}
