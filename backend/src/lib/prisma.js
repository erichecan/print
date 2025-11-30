// [2025-11-04 23:45:00] Prisma Client Singleton
// [2025-01-29 14:20:00] Enhanced with connection pool and error handling
// [2025-01-29 16:30:00] 升级到 Prisma 6.x 无 Rust 引擎模式
// 使用 @prisma/adapter-pg 适配器，不需要 Rust 引擎二进制文件
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const logger = require('../utils/logger');

let prisma;
let pool; // [2025-01-29 16:30:00] PostgreSQL 连接池（无 Rust 引擎模式）

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
      
      logger.info('[2025-01-29 16:30:00] 📦 Creating Prisma Client instance with adapter (no Rust engine)...');
      
      // [2025-01-29 16:30:00] 创建 PostgreSQL 连接池（如果还没有创建）
      if (!pool) {
        pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          // [2025-01-29 16:30:00] 连接池配置优化
          max: 10, // 最大连接数
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });
        logger.info('[2025-01-29 16:30:00] ✅ PostgreSQL connection pool created');
      }
      
      // [2025-01-29 16:30:00] 创建 Prisma 适配器（无 Rust 引擎模式）
      const adapter = new PrismaPg(pool);
      
      // [2025-01-29 16:30:00] 创建 Prisma Client 实例（使用适配器）
      if (process.env.NODE_ENV === 'production') {
        // 生产环境：使用模块级单例
        prisma = new PrismaClient({
          ...prismaConfig,
          adapter, // [2025-01-29 16:30:00] 使用适配器，不需要 Rust 引擎
        });
        
        // [2025-01-27 23:30:00] Handle connection errors gracefully
        prisma.$connect()
          .then(() => {
            logger.info('[2025-01-29 16:30:00] ✅ Prisma Client connected to database successfully (using adapter, no Rust engine)');
          })
          .catch((error) => {
            logger.error('[2025-01-29 16:30:00] ❌ Failed to connect Prisma Client to database:', error.message);
            logger.error('[2025-01-29 16:30:00]   错误详情:', error);
          });
      } else {
        // 开发环境：使用全局单例（支持热重载）
        if (!global.prisma || !global.prismaPool) {
          // [2025-01-29 16:30:00] 开发环境也需要全局连接池
          if (!global.prismaPool) {
            global.prismaPool = new Pool({
              connectionString: process.env.DATABASE_URL,
              max: 10,
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 5000,
            });
          }
          const devAdapter = new PrismaPg(global.prismaPool);
          global.prisma = new PrismaClient({
            ...prismaConfig,
            adapter: devAdapter, // [2025-01-29 16:30:00] 使用适配器
          });
        }
        prisma = global.prisma;
        // [2025-01-29 16:30:00] 开发环境使用全局 pool 引用
        if (global.prismaPool && !pool) {
          pool = global.prismaPool;
        }
      }
      
      logger.info('[2025-01-29 16:30:00] ✅ Prisma Client instance created successfully (using adapter, no Rust engine)');
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
        // [2025-01-29 16:30:00] 开发环境也使用适配器
        if (!pool) {
          pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
          });
        }
        const adapter = new PrismaPg(pool);
        global.prisma = new PrismaClient({
          ...prismaConfig,
          adapter,
        });
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
// [2025-01-29 16:30:00] 无 Rust 引擎模式也需要关闭连接池
const gracefulShutdown = async () => {
  try {
    const client = getPrisma();
    if (client) {
      await client.$disconnect();
      logger.info('[2025-01-29 16:30:00] Prisma Client disconnected gracefully (connection pool closed)');
      
      // [2025-01-29 16:30:00] 关闭 PostgreSQL 连接池
      if (pool) {
        await pool.end();
        logger.info('[2025-01-29 16:30:00] PostgreSQL connection pool closed');
      }
      // [2025-01-29 16:30:00] 开发环境也关闭全局连接池
      if (global.prismaPool) {
        await global.prismaPool.end();
        global.prismaPool = null;
        logger.info('[2025-01-29 16:30:00] Global PostgreSQL connection pool closed');
      }
    }
  } catch (error) {
    logger.error('[2025-01-29 16:30:00] Error disconnecting Prisma Client:', error);
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
