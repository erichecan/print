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

// [2025-01-29 14:50:00] 初始化 Prisma Client - 简化逻辑，确保正确读取环境变量
function getPrisma() {
  if (!prisma) {
    try {
      // [2025-01-29 14:50:00] 验证 DATABASE_URL 环境变量
      validateDatabaseUrl();
      
      // [2025-01-29 23:05:00] 检查 Prisma Client 是否已生成
      const fs = require('fs');
      const path = require('path');
      const prismaClientPath = path.join(__dirname, '../../node_modules/@prisma/client');
      
      if (!fs.existsSync(prismaClientPath)) {
        logger.warn('[2025-01-29 14:50:00] ⚠️  Prisma Client not generated yet, will be generated on server startup');
        return null;
      }
      
      logger.info('[2025-01-29 17:10:00] 📦 Creating Prisma Client instance (binary engine mode)...');
      
      // [2025-01-29 17:10:00] 创建 Prisma Client 实例（使用二进制引擎）
      if (process.env.NODE_ENV === 'production') {
        // 生产环境：使用模块级单例
        prisma = new PrismaClient(prismaConfig);
        
        // [2025-01-27 23:30:00] Handle connection errors gracefully
        prisma.$connect()
          .then(() => {
            logger.info('[2025-01-29 17:10:00] ✅ Prisma Client connected to database successfully (binary engine)');
          })
          .catch((error) => {
            logger.error('[2025-01-29 17:10:00] ❌ Failed to connect Prisma Client to database:', error.message);
            logger.error('[2025-01-29 17:10:00]   错误详情:', error);
          });
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
module.exports = new Proxy({}, {
  get(target, prop) {
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
