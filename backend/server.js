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

// [2025-01-29 23:05:00] 必须在导入应用之前生成 Prisma Client
// [2025-01-29 14:50:00] 添加 DATABASE_URL 验证和诊断日志
// [2025-01-29 15:20:00] 优先检查 Prisma Client 是否已在构建时生成（Dockerfile）
// 因为应用的路由会在导入时尝试使用 Prisma Client
const ensurePrismaClient = () => {
  try {
    console.log('[2025-01-29 15:20:00] 🔧 Checking if Prisma Client is already generated...');
    
    // [2025-01-29 15:20:00] 检查 Prisma Client 是否已在构建时生成
    const prismaClientPath = path.join(__dirname, 'node_modules/@prisma/client');
    const generatedClientPath = path.join(__dirname, 'node_modules/.prisma/client');
    
    if (fs.existsSync(prismaClientPath) && fs.existsSync(generatedClientPath)) {
      // 检查是否有引擎文件
      const engineFiles = fs.readdirSync(generatedClientPath).filter(f => f.endsWith('.node'));
      if (engineFiles.length > 0) {
        console.log('[2025-01-29 15:20:00] ✅ Prisma Client already generated at build time');
        console.log('[2025-01-29 15:20:00]    引擎文件:', engineFiles.join(', '));
        return; // Prisma Client 已生成，跳过
      } else {
        console.log('[2025-01-29 15:20:00] ⚠️  Prisma Client exists but no engine files found, regenerating...');
      }
    } else {
      console.log('[2025-01-29 15:20:00] ⚠️  Prisma Client not found, generating at runtime...');
    }
    
    // [2025-01-29 14:50:00] 在生成 Prisma Client 前验证 DATABASE_URL
    validateDatabaseUrl();
    
    // [2025-01-29 23:00:00] 运行时生成 Prisma Client（后备方案）
    console.log('[2025-01-29 15:20:00] 📦 Generating Prisma Client at runtime...');
    
    // [2025-01-29 15:00:00] 确保环境变量正确传递，明确禁用 DataProxy 并确保生成引擎
    // [2025-01-29 15:00:00] 关键：需要明确设置环境变量，确保 Prisma Client 生成时包含数据库引擎
    const generateEnv = {
      ...process.env,
      // [2025-01-29 15:00:00] 明确禁用 DataProxy（避免使用 prisma:// 协议）
      PRISMA_GENERATE_DATAPROXY: 'false',
      PRISMA_CLI_GENERATE_DATAPROXY: 'false',
      // [2025-01-29 15:00:00] 确保 DATABASE_URL 被传递到生成过程中
      DATABASE_URL: process.env.DATABASE_URL,
      // [2025-01-29 15:00:00] 确保生成时包含引擎（不是 engine=none）
      PRISMA_GENERATE_SKIP_AUTOINSTALL: 'false',
    };
    
    // [2025-01-29 15:00:00] 打印环境变量信息（不暴露密码）
    const dbUrlPreview = process.env.DATABASE_URL 
      ? process.env.DATABASE_URL.substring(0, 20) + '...' 
      : 'NOT SET';
    console.log('[2025-01-29 15:20:00] 📋 DATABASE_URL preview:', dbUrlPreview);
    console.log('[2025-01-29 15:20:00] 📋 PRISMA_GENERATE_DATAPROXY:', generateEnv.PRISMA_GENERATE_DATAPROXY);
    
    execSync('npx prisma generate --schema=./prisma/schema.prisma', { 
      stdio: 'inherit',
      cwd: __dirname,
      timeout: 120000, // 120秒超时，给 Prisma 更多时间
      env: generateEnv,
    });
    
    console.log('[2025-01-29 15:20:00] ✅ Prisma Client generated successfully at runtime.');
  } catch (error) {
    console.error('[2025-01-29 15:20:00] ❌ Failed to generate Prisma Client:', error.message);
    console.error('[2025-01-29 15:20:00]    这会导致数据库操作失败，请检查日志');
    console.error('[2025-01-29 15:20:00]    错误详情:', error);
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

