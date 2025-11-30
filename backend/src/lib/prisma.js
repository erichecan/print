// [2025-11-04 23:45:00] Prisma Client Singleton
// [2025-01-27 23:30:00] Enhanced with connection pool and error handling
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

let prisma;

// [2025-01-29 14:20:00] Prisma Client configuration - 不要在运行时设置 datasources
// [2025-01-29 14:20:00] datasources 应该在 schema.prisma 中配置，Prisma Client 会自动读取 DATABASE_URL 环境变量
const prismaConfig = {
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn', 'info']
    : ['error', 'warn'],
  // [2025-01-29 14:20:00] 移除 datasources 配置，让 Prisma 从 schema.prisma 和环境变量自动读取
  // [2025-01-27 23:30:00] Connection pool configuration for production
  ...(process.env.NODE_ENV === 'production' && {
    // Optimize connection pool for Cloud Run
    // Cloud Run instances can scale, so we want efficient connection pooling
    // These values work well with Cloud Run's scaling behavior
  }),
};

// [2025-01-29 23:05:00] 延迟初始化 PrismaClient，避免在 Prisma Client 生成之前就创建实例
// 在 Cloud Run 环境中，Prisma Client 需要在运行时生成，所以不能立即创建
function getPrisma() {
  if (!prisma) {
    try {
      // [2025-01-29 23:05:00] 检查 Prisma Client 是否已生成
      const fs = require('fs');
      const path = require('path');
      const prismaClientPath = path.join(__dirname, '../../node_modules/@prisma/client');
      
      // 如果 Prisma Client 不存在，返回 null 或抛出错误
      if (!fs.existsSync(prismaClientPath)) {
        logger.warn('[2025-01-29 23:05:00] ⚠️  Prisma Client not generated yet, will be generated on server startup');
        // 不立即创建，等待 server.js 的 ensurePrismaClient 运行
        return null;
      }
      
      // Prisma Client 已存在，可以安全创建
      if (process.env.NODE_ENV === 'production') {
        prisma = new PrismaClient(prismaConfig);
        
        // [2025-01-27 23:30:00] Handle connection errors gracefully
        prisma.$connect()
          .then(() => {
            logger.info('[2025-01-27 23:30:00] ✅ Prisma Client connected to database');
          })
          .catch((error) => {
            logger.error('[2025-01-27 23:30:00] ❌ Failed to connect Prisma Client to database:', error);
          });
      } else {
        if (!global.prisma) {
          global.prisma = new PrismaClient(prismaConfig);
        }
        prisma = global.prisma;
      }
    } catch (error) {
      // [2025-01-29 23:05:00] 如果创建失败（可能 Prisma Client 还没生成），记录警告但不抛出错误
      logger.warn('[2025-01-29 23:05:00] ⚠️  Failed to create Prisma Client (may not be generated yet):', error.message);
      return null;
    }
  }
  return prisma;
}

// [2025-01-29 23:05:00] 延迟初始化：只在第一次使用时创建
if (process.env.NODE_ENV === 'production') {
  // 在生产环境中，延迟初始化
  // prisma 将在第一次调用 getPrisma() 时创建
} else {
  // 开发环境中，立即创建（假设 Prisma Client 已生成）
  if (!global.prisma) {
    global.prisma = new PrismaClient(prismaConfig);
  }
  prisma = global.prisma;
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
      logger.info('[2025-01-27 23:30:00] Prisma Client disconnected gracefully');
    }
  } catch (error) {
    logger.error('[2025-01-27 23:30:00] Error disconnecting Prisma Client:', error);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// [2025-01-29 23:05:00] 导出 getter 函数，延迟初始化
// 为了向后兼容，也导出 prisma 对象（如果已创建）
module.exports = new Proxy({}, {
  get(target, prop) {
    const client = getPrisma();
    if (!client) {
      // 如果 Prisma Client 还没创建，抛出有意义的错误
      throw new Error('Prisma Client not initialized yet. Please wait for server startup to complete.');
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
