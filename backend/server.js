// [2025-11-02 20:52:00] Server entry point
require('dotenv').config();
const app = require('./src/app');
const { testConnection } = require('./src/config/database');
const logger = require('./src/utils/logger');
const { execSync } = require('child_process');

const PORT = process.env.PORT || 3000;

// [2025-11-16 16:18:00] Optionally run DB migrations before starting the server in production
// [2025-01-27 16:50:00] 确保 Prisma Client 已生成
const ensurePrismaClient = () => {
  try {
    logger.info('🔧 Ensuring Prisma Client is generated...');
    execSync('npx prisma generate --schema=../prisma/schema.prisma', { 
      stdio: 'inherit',
      cwd: __dirname,
    });
    logger.info('✅ Prisma Client generated.');
  } catch (error) {
    logger.warn('⚠️  Failed to generate Prisma Client (may already be generated):', error.message);
    // 不退出，因为可能已经生成了
  }
};

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
          execSync('npx prisma generate --schema=../prisma/schema.prisma', { 
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
  ensurePrismaClient(); // [2025-01-27 16:50:00] 确保 Prisma Client 已生成
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

