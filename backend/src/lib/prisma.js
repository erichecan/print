// [2025-11-04 23:45:00] Prisma Client Singleton
// [2025-01-29 14:20:00] Enhanced with connection pool and error handling
// [2025-01-29 17:10:00] 回退到 Prisma 5.22.0 二进制引擎模式
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

let prisma;

// [2025-01-29 14:50:00] 验证 DATABASE_URL 环境变量
function validateDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    logger.error('[2025-01-29 14:50:00] ❌ DATABASE_URL environment variable is not set');
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  // [2025-01-29 14:50:00] 验证 URL 格式（应该是 postgresql:// 或 postgres://）
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    logger.error('[2025-01-29 14:50:00] ❌ Invalid DATABASE_URL format. Expected postgresql:// or postgres://');
    logger.error('[2025-01-29 14:50:00]   当前 URL 格式:', databaseUrl.substring(0, 20) + '...');
    throw new Error(`Invalid DATABASE_URL format. Expected postgresql:// or postgres://, got: ${databaseUrl.substring(0, 20)}...`);
  }
  
  // [2025-01-29 14:50:00] 记录 URL 的前缀（不暴露密码）
  const urlParts = databaseUrl.split('@');
  const urlPrefix = urlParts.length > 1 ? urlParts[0].substring(0, 15) + '...@' + urlParts[1].split('/')[0] : '...';
  logger.info('[2025-01-29 14:50:00] ✅ DATABASE_URL validated. Format:', urlPrefix);
  
  return true;
}

// [2025-01-29 14:50:00] Prisma Client 配置 - 不设置 datasources，让 Prisma 从 schema.prisma 和环境变量自动读取
const prismaConfig = {
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn', 'info']
    : ['error', 'warn'],
  // [2025-01-29 14:50:00] 不设置 datasources，Prisma Client 会自动从 schema.prisma 和 DATABASE_URL 环境变量读取
  // [2025-01-27 23:30:00] Connection pool configuration for production
  ...(process.env.NODE_ENV === 'production' && {
    // Optimize connection pool for Cloud Run
    // Cloud Run instances can scale, so we want efficient connection pooling
    // These values work well with Cloud Run's scaling behavior
  }),
};

// [2025-01-30 20:00:00] 确保 DATABASE_URL 包含连接池参数和 SSL 配置（适用于 Cloud Run serverless 环境）
function ensureConnectionPoolParams(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    
    // [2025-01-30 20:00:00] 为 Cloud Run serverless 环境添加连接池参数
    // connection_limit: 每个实例的最大连接数（Cloud Run 建议较小值）
    // pool_timeout: 连接池超时时间（秒）
    // connect_timeout: 连接超时时间（秒）
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', process.env.NODE_ENV === 'production' ? '5' : '10');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '10');
    }
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '10');
    }
    
    // [2025-01-30 20:15:00] 添加 SSL 配置（如果数据库需要 SSL）
    // 对于 Neon、Supabase 等云数据库，通常需要 SSL
    if (!url.searchParams.has('sslmode')) {
      // 如果 URL 包含云数据库域名（neon、supabase 等），启用 SSL
      const hostname = url.hostname || '';
      if (hostname.includes('neon') || hostname.includes('supabase') || 
          hostname.includes('aws') || hostname.includes('gcp') ||
          process.env.NODE_ENV === 'production') {
        url.searchParams.set('sslmode', 'require');
        logger.info('[2025-01-30 20:15:00] ✅ Added sslmode=require for production database');
      }
    }
    
    return url.toString();
  } catch (error) {
    // 如果 URL 解析失败，返回原始 URL
    logger.warn('[2025-01-30 20:00:00] ⚠️  Failed to parse DATABASE_URL for connection pool params:', error.message);
    return databaseUrl;
  }
}

// [2025-01-30 20:00:00] 检查是否是连接错误
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

// [2025-01-30 20:00:00] 执行 Prisma 查询并处理连接错误重试
async function executeWithRetry(operation, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (isConnectionError(error) && attempt < maxRetries) {
        logger.warn(`[2025-01-30 20:00:00] ⚠️  Database connection error (attempt ${attempt}/${maxRetries}), retrying...`, {
          errorCode: error.code,
          errorName: error.name,
          errorMessage: error.message?.substring(0, 100)
        });
        
        // [2025-01-30 20:00:00] 断开并重新连接
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

// [2025-01-30 20:00:00] 导出重试函数供其他模块使用（将在最后通过 prismaProxy 导出）

// [2025-01-29 14:50:00] 初始化 Prisma Client - 简化逻辑，确保正确读取环境变量
function getPrisma() {
  if (!prisma) {
    try {
      // [2025-01-29 14:50:00] 验证 DATABASE_URL 环境变量
      validateDatabaseUrl();
      
      // [2025-01-30 20:00:00] 确保 DATABASE_URL 包含连接池参数
      let databaseUrl = process.env.DATABASE_URL;
      if (process.env.NODE_ENV === 'production') {
        databaseUrl = ensureConnectionPoolParams(databaseUrl);
        // [2025-01-30 20:00:00] 临时设置环境变量以应用连接池参数
        process.env.DATABASE_URL = databaseUrl;
      }
      
      // [2025-01-29 23:05:00] 检查 Prisma Client 是否已生成
      const fs = require('fs');
      const path = require('path');
      const prismaClientPath = path.join(__dirname, '../../node_modules/@prisma/client');
      
      logger.info('[2025-12-08 00:57:00] 🔍 Checking Prisma Client path:', prismaClientPath);
      logger.info('[2025-12-08 00:57:00] 🔍 Path exists:', fs.existsSync(prismaClientPath));
      
      if (!fs.existsSync(prismaClientPath)) {
        logger.warn('[2025-01-29 14:50:00] ⚠️  Prisma Client not generated yet, will be generated on server startup');
        logger.warn('[2025-12-08 00:57:00] ⚠️  Expected path:', prismaClientPath);
        // [2025-12-08 00:57:00] 在生产环境中，Prisma Client 应该在构建时生成，如果不存在可能是路径问题
        // 尝试直接创建 Prisma Client，让它在第一次查询时连接
        logger.info('[2025-12-08 00:57:00] 🔧 Attempting to create Prisma Client anyway (may work if generated at build time)...');
      }
      
      logger.info('[2025-01-29 17:10:00] 📦 Creating Prisma Client instance (binary engine mode)...');
      
      // [2025-12-07 04:00:00] 创建 Prisma Client 实例（使用二进制引擎）
      // 配置连接池，延迟连接以避免阻塞启动
      const clientConfig = {
        ...prismaConfig,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        // [2025-12-07 04:00:00] 延迟连接，不立即连接数据库
        // Prisma Client 会在第一次查询时自动连接
      };
      
      if (process.env.NODE_ENV === 'production') {
        // 生产环境：使用模块级单例，不立即连接
        prisma = new PrismaClient(clientConfig);
        
        // [2025-12-07 04:00:00] 不立即连接，让服务器先启动
        // Prisma Client 会在第一次查询时自动连接
        logger.info('[2025-01-29 17:10:00] ✅ Prisma Client instance created (will connect on first query)');
      } else {
        // 开发环境：使用全局单例（支持热重载）
        if (!global.prisma) {
          global.prisma = new PrismaClient(prismaConfig);
        }
        prisma = global.prisma;
      }
      
      logger.info('[2025-01-29 17:10:00] ✅ Prisma Client instance created successfully (binary engine)');
    } catch (error) {
      logger.error('[2025-01-29 14:50:00] ❌ Failed to create Prisma Client:', error.message);
      logger.error('[2025-01-29 14:50:00]   错误堆栈:', error.stack);
      throw error; // [2025-01-29 14:50:00] 抛出错误，让调用者知道初始化失败
    }
  }
  return prisma;
}

// [2025-01-29 14:50:00] 在生产环境中延迟初始化，开发环境立即初始化
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
    logger.warn('[2025-01-29 14:50:00] ⚠️  Failed to initialize Prisma Client in development:', error.message);
  }
}

// [2025-11-18 14:45:00] Backward compatibility for renamed Variant model
// [2025-01-29 23:05:00] 延迟设置，等待 Prisma Client 创建
function setupBackwardCompatibility() {
  const client = getPrisma();
  if (client && client.variant && !client.productVariant) {
    client.productVariant = client.variant;
  }
}

// [2025-01-27 23:30:00] Graceful shutdown
const gracefulShutdown = async () => {
  try {
    const client = getPrisma();
    if (client) {
      await client.$disconnect();
      logger.info('[2025-01-29 17:10:00] Prisma Client disconnected gracefully');
    }
  } catch (error) {
    logger.error('[2025-01-29 17:10:00] Error disconnecting Prisma Client:', error);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// [2025-01-29 14:50:00] 导出 Prisma Client - 使用简化的方式
// 直接导出，但通过 getter 确保延迟初始化
const prismaProxy = new Proxy({}, {
  get(target, prop) {
    // [2025-01-30 20:10:00] 导出辅助函数
    if (prop === 'executeWithRetry') {
      return executeWithRetry;
    }
    if (prop === 'isConnectionError') {
      return isConnectionError;
    }
    
    const client = getPrisma();
    if (!client) {
      // [2025-01-29 14:50:00] 如果 Prisma Client 还没创建，抛出有意义的错误
      const error = new Error('Prisma Client not initialized yet. Please wait for server startup to complete.');
      logger.error('[2025-01-29 14:50:00] ❌ Prisma Client access error:', error.message);
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
