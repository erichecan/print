// Prisma Client Singleton
// Enhanced with connection pool and error handling
// 回退到 Prisma 5.22.0 二进制引擎模式
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

let prisma;

// 验证 DATABASE_URL 环境变量
function validateDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    logger.error(' ❌ DATABASE_URL environment variable is not set');
    throw new Error('DATABASE_URL environment variable is required');
  }

  // 验证 URL 格式（应该是 postgresql:// 或 postgres://）
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    logger.error(' ❌ Invalid DATABASE_URL format. Expected postgresql:// or postgres://');
    logger.error('  当前 URL 格式:', databaseUrl.substring(0, 20) + '...');
    throw new Error(`Invalid DATABASE_URL format. Expected postgresql:// or postgres://, got: ${databaseUrl.substring(0, 20)}...`);
  }

  // 记录 URL 的前缀（不暴露密码）
  const urlParts = databaseUrl.split('@');
  const urlPrefix = urlParts.length > 1 ? urlParts[0].substring(0, 15) + '...@' + urlParts[1].split('/')[0] : '...';
  logger.info(' ✅ DATABASE_URL validated. Format:', urlPrefix);

  return true;
}

// Prisma Client 配置 - 不设置 datasources，让 Prisma 从 schema.prisma 和环境变量自动读取
const prismaConfig = {
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn', 'info']
    : ['error', 'warn'],
  // 不设置 datasources，Prisma Client 会自动从 schema.prisma 和 DATABASE_URL 环境变量读取
  // Connection pool configuration for production
  ...(process.env.NODE_ENV === 'production' && {
    // Optimize connection pool for Cloud Run
    // Cloud Run instances can scale, so we want efficient connection pooling
    // These values work well with Cloud Run's scaling behavior
  }),
};

// 2026-03-06: 修复密码中含 @ 等特殊字符导致 URL 被错误解析（如 host 变成 "g8"）
// 当 URL 含 "@/" 且解析出的 hostname 异常短时，按 "user:password@/db" 重解析并编码密码
function fixDatabaseUrlIfMisparsed(databaseUrl) {
  if (!databaseUrl || typeof databaseUrl !== 'string') return databaseUrl;
  const atSlash = databaseUrl.indexOf('@/');
  if (atSlash < 0) return databaseUrl;
  try {
    const url = new URL(databaseUrl);
    const hostname = (url.hostname || '').trim();
    // hostname 异常短且非 localhost/ip 时，可能是密码里的 @ 导致后半段被当成 host
    if (hostname.length > 0 && hostname.length <= 4 && !/^[\d.]+$/.test(hostname) && hostname !== 'localhost') {
      const afterProtocol = databaseUrl.indexOf('://') + 3;
      if (atSlash > afterProtocol) {
        const authPart = databaseUrl.slice(afterProtocol, atSlash);
        const colonIdx = authPart.indexOf(':');
        if (colonIdx > 0) {
          const user = authPart.slice(0, colonIdx);
          const password = authPart.slice(colonIdx + 1);
          const encoded = encodeURIComponent(password);
          const pathAndQuery = databaseUrl.slice(atSlash + 2); // 跳过 "@/"，取 suvernireplus?...
          const fixed = `postgresql://${user}:${encoded}@/${pathAndQuery}`;
          logger.info(' ✅ DATABASE_URL 已修复：密码中含特殊字符导致 host 被误解析，已重新编码');
          return fixed;
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return databaseUrl;
}

// 确保 DATABASE_URL 包含连接池参数和 SSL 配置（适用于 Cloud Run serverless 环境）
// 2026-03-06: 使用纯字符串操作代替 new URL() 和 URLSearchParams，因为：
// 1) JS URL API 无法正确处理 Cloud SQL socket URL（postgresql://user:pass@/db?host=/cloudsql/...）
// 2) URLSearchParams.toString() 会把 /cloudsql/ 编码成 %2Fcloudsql%2F，可能导致连接失败
function ensureConnectionPoolParams(databaseUrl) {
  try {
    databaseUrl = fixDatabaseUrlIfMisparsed(databaseUrl);

    // 检查现有参数（简单字符串检查）
    const hasParam = (name) => databaseUrl.includes(`${name}=`);
    const separator = databaseUrl.includes('?') ? '&' : '?';
    let additions = [];

    // 为 Cloud Run serverless 环境添加连接池参数
    if (!hasParam('connection_limit')) {
      additions.push(`connection_limit=${process.env.NODE_ENV === 'production' ? '5' : '10'}`);
    }
    if (!hasParam('pool_timeout')) {
      additions.push('pool_timeout=10');
    }
    if (!hasParam('connect_timeout')) {
      additions.push('connect_timeout=10');
    }

    // Cloud SQL 通过 Unix socket（host=/cloudsql/...）连接时不要加 sslmode
    const isCloudSqlSocket = databaseUrl.includes('host=/cloudsql/');
    if (!hasParam('sslmode') && !isCloudSqlSocket) {
      // 检查 base URL 中的 hostname（@ 和下一个 / 之间的部分）
      const atIndex = databaseUrl.indexOf('@');
      const afterAt = atIndex >= 0 ? databaseUrl.substring(atIndex + 1) : '';
      const hostInUrl = afterAt.split('/')[0].split('?')[0];
      if (hostInUrl.length > 0 && (
        hostInUrl.includes('neon') || hostInUrl.includes('supabase') ||
        hostInUrl.includes('aws') || hostInUrl.includes('gcp') ||
        process.env.NODE_ENV === 'production')) {
        additions.push('sslmode=require');
        logger.info(' ✅ Added sslmode=require for production database');
      }
    }

    if (additions.length > 0) {
      databaseUrl = databaseUrl + separator + additions.join('&');
    }

    logger.info(' ✅ DATABASE_URL connection pool params ensured (string-based, no URL API corruption)');
    return databaseUrl;
  } catch (error) {
    // 如果处理失败，返回原始 URL
    logger.warn(' ⚠️ Failed to add connection pool params:', error.message);
    return databaseUrl;
  }
}

// 检查是否是连接错误
function isConnectionError(error) {
  if (!error) return false;

  // Prisma 错误代码
  const connectionErrorCodes = [
    'P1001', // Can't reach database server
    'P1008', // Operations timed out
    'P1017', // Server has closed the connection
  ];

  if (error.code && connectionErrorCodes.includes(error.code)) {
    return true;
  }

  // 检查错误消息中是否包含连接相关关键词
  const errorMessage = error.message?.toLowerCase() || '';
  const connectionKeywords = [
    'closed',
    'connection',
    'timeout',
    'connect',
    'socket disconnected',
    'tls connection',
    'network socket',
    'econnrefused',
    'enotfound'
  ];

  return connectionKeywords.some(keyword => errorMessage.includes(keyword));
}

// 执行 Prisma 查询并处理连接错误重试
async function executeWithRetry(operation, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (isConnectionError(error) && attempt < maxRetries) {
        logger.warn(` ⚠️ Database connection error (attempt ${attempt}/${maxRetries}), retrying...`, {
          errorCode: error.code,
          errorName: error.name,
          errorMessage: error.message?.substring(0, 100)
        });

        // 断开并重新连接
        try {
          const client = getPrisma();
          await client.$disconnect();
          // 等待一小段时间后重试（指数退避）
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        } catch (disconnectError) {
          // 忽略断开连接的错误
        }

        continue;
      }

      // 如果重试次数用完或不是连接错误，抛出错误
      throw error;
    }
  }
}

// 导出重试函数供其他模块使用（将在最后通过 prismaProxy 导出）

// 初始化 Prisma Client - 简化逻辑，确保正确读取环境变量
function getPrisma() {
  if (!prisma) {
    try {
      // 验证 DATABASE_URL 环境变量
      validateDatabaseUrl();

      // 确保 DATABASE_URL 先修复密码解析问题，再添加连接池参数（2026-03-06）
      let databaseUrl = fixDatabaseUrlIfMisparsed(process.env.DATABASE_URL);
      if (process.env.NODE_ENV === 'production') {
        databaseUrl = ensureConnectionPoolParams(databaseUrl);
      }
      process.env.DATABASE_URL = databaseUrl;

      // 检查 Prisma Client 是否已生成
      const fs = require('fs');
      const path = require('path');
      const prismaClientPath = path.join(__dirname, '../../node_modules/@prisma/client');

      logger.info(' 🔍 Checking Prisma Client path:', prismaClientPath);
      logger.info(' 🔍 Path exists:', fs.existsSync(prismaClientPath));

      if (!fs.existsSync(prismaClientPath)) {
        logger.warn(' ⚠️ Prisma Client not generated yet, will be generated on server startup');
        logger.warn(' ⚠️ Expected path:', prismaClientPath);
        // 在生产环境中，Prisma Client 应该在构建时生成，如果不存在可能是路径问题
        // 尝试直接创建 Prisma Client，让它在第一次查询时连接
        logger.info(' 🔧 Attempting to create Prisma Client anyway (may work if generated at build time)...');
      }

      logger.info(' 📦 Creating Prisma Client instance (binary engine mode)...');

      // 创建 Prisma Client 实例（使用二进制引擎）
      // 配置连接池，延迟连接以避免阻塞启动
      const clientConfig = {
        ...prismaConfig,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        // 延迟连接，不立即连接数据库
        // Prisma Client 会在第一次查询时自动连接
      };

      if (process.env.NODE_ENV === 'production') {
        // 生产环境：使用模块级单例，不立即连接
        prisma = new PrismaClient(clientConfig);

        // 不立即连接，让服务器先启动
        // Prisma Client 会在第一次查询时自动连接
        logger.info(' ✅ Prisma Client instance created (will connect on first query)');
      } else {
        // 开发环境：使用全局单例（支持热重载）
        if (!global.prisma) {
          global.prisma = new PrismaClient(prismaConfig);
        }
        prisma = global.prisma;
      }

      logger.info(' ✅ Prisma Client instance created successfully (binary engine)');
    } catch (error) {
      logger.error(' ❌ Failed to create Prisma Client:', error.message);
      logger.error('  错误堆栈:', error.stack);
      throw error; // 抛出错误，让调用者知道初始化失败
    }
  }
  return prisma;
}

// 在生产环境中延迟初始化，开发环境立即初始化
if (process.env.NODE_ENV === 'production') {
  // 在生产环境中，Prisma Client 将在第一次使用时创建
  // server.js 会确保 Prisma Client 已生成后再导入应用
} else {
  // 开发环境：如果 Prisma Client 已生成，立即创建
  try {
    const fs = require('fs');
    const path = require('path');
    const prismaClientPath = path.join(__dirname, '../../node_modules/@prisma/client');
    if (fs.existsSync(prismaClientPath)) {
      if (!global.prisma) {
        validateDatabaseUrl();
        global.prisma = new PrismaClient(prismaConfig);
      }
      prisma = global.prisma;
    }
  } catch (error) {
    logger.warn(' ⚠️ Failed to initialize Prisma Client in development:', error.message);
  }
}

// Backward compatibility for renamed Variant model
// 延迟设置，等待 Prisma Client 创建
function setupBackwardCompatibility() {
  const client = getPrisma();
  if (client && client.variant && !client.productVariant) {
    client.productVariant = client.variant;
  }
}

// Graceful shutdown
const gracefulShutdown = async () => {
  try {
    const client = getPrisma();
    if (client) {
      await client.$disconnect();
      logger.info(' Prisma Client disconnected gracefully');
    }
  } catch (error) {
    logger.error(' Error disconnecting Prisma Client:', error);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// 导出 Prisma Client - 使用简化的方式
// 直接导出，但通过 getter 确保延迟初始化
const prismaProxy = new Proxy({}, {
  get(target, prop) {
    // 导出辅助函数
    if (prop === 'executeWithRetry') {
      return executeWithRetry;
    }
    if (prop === 'isConnectionError') {
      return isConnectionError;
    }

    const client = getPrisma();
    if (!client) {
      // 如果 Prisma Client 还没创建，抛出有意义的错误
      const error = new Error('Prisma Client not initialized yet. Please wait for server startup to complete.');
      logger.error(' ❌ Prisma Client access error:', error.message);
      throw error;
    }
    setupBackwardCompatibility();
    return client[prop];
  },
  set(target, prop, value) {
    const client = getPrisma();
    if (client) {
      client[prop] = value;
    }
    return true;
  }
});

module.exports = prismaProxy;
