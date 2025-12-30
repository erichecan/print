// [2025-11-02 20:52:00] Server entry point
require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs'); // [2025-01-29 22:55:00] 用于检查 Prisma Client 是否存在
const path = require('path'); // [2025-01-29 22:55:00] 用于路径操作

const PORT = process.env.PORT || 3001; // [2025-01-27 17:05:00] 默认端口改为3001，避免与前端冲突

// [2025-01-29 14:50:00] 验证 DATABASE_URL 环境变量
const validateDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('[2025-01-29 14:50:00] ❌ DATABASE_URL environment variable is not set');
    console.error('[2025-01-29 14:50:00]    请检查 Secret Manager 中的 database-url secret 是否正确配置');
    throw new Error('DATABASE_URL environment variable is required');
  }

  // [2025-01-29 14:50:00] 验证 URL 格式
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    console.error('[2025-01-29 14:50:00] ❌ Invalid DATABASE_URL format');
    console.error('[2025-01-29 14:50:00]    期望格式: postgresql://user:password@host:port/database');
    console.error('[2025-01-29 14:50:00]    当前格式:', databaseUrl.substring(0, 30) + '...');
    throw new Error(`Invalid DATABASE_URL format. Expected postgresql:// or postgres://, got: ${databaseUrl.substring(0, 30)}...`);
  }

  // [2025-01-29 14:50:00] 记录 URL 前缀（不暴露密码）
  try {
    const urlParts = databaseUrl.split('@');
    if (urlParts.length > 1) {
      const hostPart = urlParts[1].split('/')[0];
      console.log('[2025-01-29 14:50:00] ✅ DATABASE_URL validated');
      console.log('[2025-01-29 14:50:00]    数据库主机:', hostPart);
    }
  } catch (e) {
    // 忽略解析错误，继续执行
  }
};

// [2025-12-02 03:55:00] 验证 JWT_SECRET 环境变量
const validateJwtSecret = () => {
  const DEFAULT_JWT_SECRET = 'your_jwt_secret_key_change_in_production';
  const jwtSecret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!jwtSecret || jwtSecret === DEFAULT_JWT_SECRET) {
    if (isProduction) {
      console.error('[2025-12-02 03:55:00] ❌ CRITICAL: JWT_SECRET is not set or using default value in PRODUCTION!');
      console.error('[2025-12-02 03:55:00]    这是一个严重的安全风险！');
      console.error('[2025-12-02 03:55:00]    请立即设置 JWT_SECRET 环境变量为强随机字符串');
      console.error('[2025-12-02 03:55:00]    生成方法: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
      throw new Error('JWT_SECRET must be set in production environment');
    } else {
      console.warn('[2025-12-02 03:55:00] ⚠️  WARNING: JWT_SECRET is not set or using default value');
      console.warn('[2025-12-02 03:55:00]    开发环境可以使用默认值，但生产环境必须设置强随机字符串');
      console.warn('[2025-12-02 03:55:00]    生成方法: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    }
  } else {
    if (jwtSecret.length < 32) {
      console.warn('[2025-12-02 03:55:00] ⚠️  WARNING: JWT_SECRET is shorter than recommended (32 characters)');
      console.warn('[2025-12-02 03:55:00]    建议使用至少 32 字符的强随机字符串');
    } else {
      console.log('[2025-12-02 03:55:00] ✅ JWT_SECRET validated');
      console.log('[2025-12-02 03:55:00]    长度:', jwtSecret.length, '字符');
    }
  }
};

// [2025-12-07 03:55:00] Prisma Client 已在 Docker 构建时生成，无需运行时生成
console.log('[2025-12-07 03:55:00] 🚀 Starting backend server...');
console.log('[2025-12-07 03:55:00] 📋 Environment:', process.env.NODE_ENV || 'development');
console.log('[2025-12-07 03:55:00] 🔌 PORT:', PORT);

// 验证环境变量
try {
  validateJwtSecret();
  console.log('[2025-12-07 03:55:00] ✅ JWT_SECRET validated');
} catch (error) {
  console.error('[2025-12-07 03:55:00] ❌ JWT_SECRET validation failed:', error.message);
  process.exit(1);
}

// [2025-01-29 23:05:00] 现在可以安全地导入应用
console.log('[2025-12-07 03:55:00] 📦 Loading application modules...');
const app = require('./src/app');
const { testConnection } = require('./src/config/database');
const logger = require('./src/utils/logger');
console.log('[2025-12-07 03:55:00] ✅ Application modules loaded');

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

// [2025-12-07 03:50:00] 优化启动流程：先启动服务器，再测试数据库连接
// 这样可以更快响应 Cloud Run 的健康检查
const http = require('http');
const httpServer = http.createServer(app);

// [2025-12-07 01:30:00] Initialize Socket.IO chat server
const { initializeChatServer } = require('./src/socket/chatServer');
const io = initializeChatServer(httpServer);
logger.info('✅ Socket.IO chat server initialized');

// [2025-12-07 03:50:00] 立即启动服务器监听，不等待数据库连接测试

// Start Server
const server = httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📡 API available at http://localhost:${PORT}/api`);
  logger.info(`💬 WebSocket available at ws://localhost:${PORT}/socket.io`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

  // [2025-12-07 03:50:00] 服务器启动后，异步测试数据库连接和运行迁移
  testConnection().then(() => {
    logger.info('✅ Database connection verified');
    runMigrationsIfEnabled();
  }).catch((error) => {
    logger.error('⚠️  Database connection test failed, but server is running:', error);
    logger.warn('   某些需要数据库的功能可能不可用，但服务器会继续运行');
    // 不退出进程，让服务器继续运行
  });
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

