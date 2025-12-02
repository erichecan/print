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

// [2025-01-29 23:05:00] 必须在导入应用之前生成 Prisma Client
// [2025-01-29 17:30:00] 方案 1：回到运行时生成（使用真实的 DATABASE_URL）
// 因为应用的路由会在导入时尝试使用 Prisma Client
const ensurePrismaClient = () => {
  try {
    console.log('[2025-01-29 17:30:00] 🔧 Ensuring Prisma Client is generated at runtime...');
    
    // [2025-01-29 17:30:00] 在生成 Prisma Client 前验证 DATABASE_URL（确保是真实的数据库 URL）
    validateDatabaseUrl();
    
    // [2025-01-29 17:30:00] 运行时生成 Prisma Client（使用真实的 DATABASE_URL，不会被误判为 DataProxy）
    console.log('[2025-01-29 17:30:00] 📦 Generating Prisma Client at runtime (using real DATABASE_URL)...');
    
    // [2025-01-29 17:30:00] 使用真实的环境变量（包括真实的 DATABASE_URL）
    // 不需要设置额外的 PRISMA_* 环境变量，让 Prisma 自动检测和使用标准引擎
    const generateEnv = {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL, // 确保传递真实的 DATABASE_URL
    };
    
    // [2025-01-29 17:30:00] 打印环境变量信息（不暴露密码）
    const dbUrlPreview = process.env.DATABASE_URL 
      ? process.env.DATABASE_URL.substring(0, 20) + '...' 
      : 'NOT SET';
    console.log('[2025-01-29 17:30:00] 📋 DATABASE_URL preview:', dbUrlPreview);
    
    execSync('npx prisma generate --schema=./prisma/schema.prisma', { 
      stdio: 'inherit',
      cwd: __dirname,
      timeout: 120000, // 120秒超时
      env: generateEnv,
    });
    
    console.log('[2025-01-29 17:30:00] ✅ Prisma Client generated successfully at runtime.');
  } catch (error) {
    console.error('[2025-01-29 17:30:00] ❌ Failed to generate Prisma Client:', error.message);
    console.error('[2025-01-29 17:30:00]    这会导致数据库操作失败，请检查日志');
    console.error('[2025-01-29 17:30:00]    错误详情:', error);
    // [2025-01-29 23:00:00] 在 Cloud Run 上，如果 Prisma Client 生成失败，退出进程
    process.exit(1);
  }
};

// [2025-12-02 03:55:00] 验证环境变量
validateJwtSecret();

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

