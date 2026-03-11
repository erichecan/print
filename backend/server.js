// Server entry point
require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs'); // 用于检查 Prisma Client 是否存在
const path = require('path'); // 用于路径操作

// 临时禁用 SSL 证书验证以解决 Cloud Run 上的 ECONNRESET 问题
// 这是一个全局修复，适用于 runtime 和 migration (作为子进程继承)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PORT = process.env.PORT || 3001; // 默认端口改为3001，避免与前端冲突

// 验证 DATABASE_URL 环境变量
const validateDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error(' ❌ DATABASE_URL environment variable is not set');
    console.error('  请检查 Secret Manager 中的 database-url secret 是否正确配置');
    throw new Error('DATABASE_URL environment variable is required');
  }

  // 验证 URL 格式
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    console.error(' ❌ Invalid DATABASE_URL format');
    console.error('  期望格式: postgresql://user:password@host:port/database');
    console.error('  当前格式:', databaseUrl.substring(0, 30) + '...');
    throw new Error(`Invalid DATABASE_URL format. Expected postgresql:// or postgres://, got: ${databaseUrl.substring(0, 30)}...`);
  }

  // 记录 URL 前缀（不暴露密码）
  try {
    const urlParts = databaseUrl.split('@');
    if (urlParts.length > 1) {
      const hostPart = urlParts[1].split('/')[0];
      console.log(' ✅ DATABASE_URL validated');
      console.log('  数据库主机:', hostPart);
    }
  } catch (e) {
    // 忽略解析错误，继续执行
  }
};

// 验证 JWT_SECRET 环境变量
const validateJwtSecret = () => {
  const DEFAULT_JWT_SECRET = 'your_jwt_secret_key_change_in_production';
  const jwtSecret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!jwtSecret || jwtSecret === DEFAULT_JWT_SECRET) {
    if (isProduction) {
      console.error(' ❌ CRITICAL: JWT_SECRET is not set or using default value in PRODUCTION!');
      console.error('  这是一个严重的安全风险！');
      console.error('  请立即设置 JWT_SECRET 环境变量为强随机字符串');
      console.error('  生成方法: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
      throw new Error('JWT_SECRET must be set in production environment');
    } else {
      console.warn(' ⚠️ WARNING: JWT_SECRET is not set or using default value');
      console.warn('  开发环境可以使用默认值，但生产环境必须设置强随机字符串');
      console.warn('  生成方法: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    }
  } else {
    if (jwtSecret.length < 32) {
      console.warn(' ⚠️ WARNING: JWT_SECRET is shorter than recommended (32 characters)');
      console.warn('  建议使用至少 32 字符的强随机字符串');
    } else {
      console.log(' ✅ JWT_SECRET validated');
      console.log('  长度:', jwtSecret.length, '字符');
    }
  }
};

// Prisma Client 已在 Docker 构建时生成，无需运行时生成
console.log(' 🚀 Starting backend server...');
console.log(' 📋 Environment:', process.env.NODE_ENV || 'development');
console.log(' 🔌 PORT:', PORT);

// 验证环境变量
try {
  validateJwtSecret();
  console.log(' ✅ JWT_SECRET validated');
} catch (error) {
  console.error(' ❌ JWT_SECRET validation failed:', error.message);
  process.exit(1);
}

// 现在可以安全地导入应用
console.log(' 📦 Loading application modules...');
const app = require('./src/app');
const { testConnection } = require('./src/config/database');
const logger = require('./src/utils/logger');
console.log(' ✅ Application modules loaded');

// 改进迁移执行，失败时不阻止服务器启动
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

        // 迁移后自动修复 base_price 列问题
        // 使用直接 SQL 脚本，不依赖 Prisma Client
        // 修复后重新生成 Prisma Client 以确保使用正确的 schema
        /* 
        // 暂时注释掉不存在的脚本
      try {
        logger.info('🔧 Running database column fix (direct SQL)...');
        execSync('node scripts/fix-base-price-direct-sql.js', {
          stdio: 'inherit',
          timeout: 30000, // 30秒超时
          cwd: __dirname,
        });
        logger.info('✅ Database column fix completed.');

// 修复后重新生成 Prisma Client 以确保使用正确的 schema
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
      */
      } catch (migrationError) {
        // 迁移失败时不退出服务器
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
    // 即使迁移失败，也继续启动服务器
    logger.warn('⚠️  Server will continue to start despite migration failure');
  }
};

// 2026-03-11 修复：在 listen 之前先跑 DB 连接 + 迁移，避免 Cloud Run 在迁移完成前 SIGTERM 导致 schema 从未同步
const http = require('http');
const httpServer = http.createServer(app);

const { initializeChatServer } = require('./src/socket/chatServer');
const io = initializeChatServer(httpServer);
logger.info('✅ Socket.IO chat server initialized');

function startListening() {
  httpServer.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📡 API available at http://localhost:${PORT}/api`);
    logger.info(`💬 WebSocket available at ws://localhost:${PORT}/socket.io`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// 先验证 DB 连接；若开启 AUTO_MIGRATE 则同步执行迁移后再 listen
testConnection()
  .then(() => {
    logger.info('✅ Database connection verified');
    if (process.env.AUTO_MIGRATE === 'true') {
      logger.info('🔧 AUTO_MIGRATE=true: running migrations before starting HTTP server...');
      try {
        require('child_process').execSync('node scripts/run-migrations.js', {
          stdio: 'inherit',
          timeout: 120000,
          cwd: path.join(__dirname),
        });
        logger.info('✅ Migrations completed.');
      } catch (e) {
        logger.warn('⚠️  Migrations failed (server will start anyway):', e.message);
      }
    } else {
      runMigrationsIfEnabled();
    }
    startListening();
  })
  .catch((err) => {
    logger.error('⚠️  Database connection test failed, but server will start:', err.message);
    startListening();
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

