// [2025-11-02 20:52:00] Server entry point
require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs'); // [2025-01-29 22:55:00] 用于检查 Prisma Client 是否存在
const path = require('path'); // [2025-01-29 22:55:00] 用于路径操作

const PORT = process.env.PORT || 3001; // [2025-01-27 17:05:00] 默认端口改为3001，避免与前端冲突

// [2025-01-29 23:05:00] 必须在导入应用之前生成 Prisma Client
// 因为应用的路由会在导入时尝试使用 Prisma Client
const ensurePrismaClient = () => {
  try {
    console.log('🔧 Ensuring Prisma Client is generated...');
    // [2025-01-29 23:00:00] 在 Cloud Run 上，每次都重新生成以确保正确
    console.log('📦 Generating Prisma Client...');
    execSync('npx prisma generate --schema=./prisma/schema.prisma', { 
      stdio: 'inherit',
      cwd: __dirname,
      timeout: 120000, // 120秒超时，给 Prisma 更多时间
      env: { ...process.env, PRISMA_GENERATE_DATAPROXY: 'false' },
    });
    console.log('✅ Prisma Client generated successfully.');
  } catch (error) {
    console.error('❌ Failed to generate Prisma Client:', error.message);
    console.error('   这会导致数据库操作失败，请检查日志');
    // [2025-01-29 23:00:00] 在 Cloud Run 上，如果 Prisma Client 生成失败，退出进程
    process.exit(1);
  }
};

// [2025-01-29 23:05:00] 在导入应用之前生成 Prisma Client
ensurePrismaClient();

// [2025-01-29 23:05:00] 现在可以安全地导入应用
const app = require('./src/app');
const { testConnection } = require('./src/config/database');
const logger = require('./src/utils/logger');

// [2025-01-27 17:15:00] 改进迁移执行，失败时不阻止服务器启动
const runMigrationsIfEnabled = () => {
  try {
    if (process.env.AUTO_MIGRATE === 'true') {
      logger.info('🔧 AUTO_MIGRATE=true detected. Running database migrations...');
      try {
        execSync('node scripts/run-migrations.js', { 
          stdio: 'inherit',
          timeout: 60000, // 60秒超时
        });
        logger.info('✅ Database migrations completed.');
        
        // [2025-01-11 14:52:00] 迁移后自动修复 base_price 列问题
        // [2025-01-11 14:58:00] 使用直接 SQL 脚本，不依赖 Prisma Client
        try {
          logger.info('🔧 Running database column fix (direct SQL)...');
          execSync('node scripts/fix-base-price-direct-sql.js', { 
            stdio: 'inherit',
            timeout: 30000, // 30秒超时
            cwd: __dirname,
          });
          logger.info('✅ Database column fix completed.');
          
          // [2025-01-11 14:55:00] 修复后重新生成 Prisma Client 以确保使用正确的 schema
          logger.info('🔧 Regenerating Prisma Client after column fix...');
          execSync('npx prisma generate --schema=./prisma/schema.prisma', { 
            stdio: 'inherit',
            timeout: 30000,
            cwd: __dirname,
          });
          logger.info('✅ Prisma Client regenerated.');
        } catch (fixError) {
          logger.warn('⚠️  Database column fix failed, but server will continue to start');
          logger.warn('   错误详情:', fixError.message);
          // 不退出，让服务器继续启动
        }
      } catch (migrationError) {
        // [2025-01-27 17:15:00] 迁移失败时不退出服务器
        // 如果数据库已经是最新的，迁移失败不应该阻止服务器启动
        logger.warn('⚠️  Database migrations failed, but server will continue to start');
        logger.warn('   如果数据库已经是最新状态，可以忽略此错误');
        logger.warn('   错误详情:', migrationError.message);
        // 不退出，让服务器继续启动
      }
    } else {
      logger.info('ℹ️  AUTO_MIGRATE not enabled. Skipping migrations.');
    }
  } catch (error) {
    logger.error('❌ Failed to run migrations:', error);
    // [2025-01-27 17:15:00] 即使迁移失败，也继续启动服务器
    logger.warn('⚠️  Server will continue to start despite migration failure');
  }
};

// Test database connection before starting server
testConnection().then(() => {
  // [2025-01-29 23:05:00] Prisma Client 已在导入应用前生成
  runMigrationsIfEnabled();
  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📡 API available at http://localhost:${PORT}/api`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

