// Server entry point
require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs'); // 用于检查 Prisma Client 是否存在
const path = require('path'); // 用于路径操作

// 临时禁用 SSL 证书验证以解决 Cloud Run 上的 ECONNRESET 问题
// 这是一个全局修复，适用于 runtime 和 migration (作为子进程继承)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PORT = process.env.PORT || 3001; // 默认端口改为3001，避免与前端冲突

// 验证关键环境变量
const criticalEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'STRIPE_SECRET_KEY'];
criticalEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        console.error(`❌ CRITICAL ERROR: Environment variable ${varName} is missing!`);
    } else if (process.env[varName].trim() === '') {
        console.error(`❌ CRITICAL ERROR: Environment variable ${varName} is empty!`);
    } else {
        console.log(`✅ Environment variable ${varName} is set (length: ${process.env[varName].length})`);
    }
});

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
// 2026-04-01 优化：在生产环境不再立即退出，而是记录错误并允许服务器启动，
// 这样 Cloud Run 可以成功监听端口，用户可以通过日志发现并修复配额/Secret 问题。
try {
  validateJwtSecret();
} catch (error) {
  console.error(' ❌ JWT_SECRET validation failed:', error.message);
  // 不再执行 process.exit(1)
  process.env.JWT_SECRET_ERROR = error.message;
}

// 现在可以安全地导入应用
console.log(' 📦 Loading application modules...');
const app = require('./src/app');
const { testConnection } = require('./src/config/database');
const logger = require('./src/utils/logger');
console.log(' ✅ Application modules loaded');

// 2026-04-01 优化：立即开启端口监听，避免 Cloud Run 因长时间未响应而判定启动失败
// 数据库连接和迁移将在后台异步执行
const http = require('http');
const httpServer = http.createServer(app);

const { initializeChatServer } = require('./src/socket/chatServer');
try {
  const io = initializeChatServer(httpServer);
  logger.info('✅ Socket.IO chat server initialized');
} catch (socketError) {
  logger.error('❌ Failed to initialize Socket.IO server:', socketError.message);
}

function startListening() {
  httpServer.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📡 API available at http://localhost:${PORT}/api`);
    logger.info(`💬 WebSocket available at ws://localhost:${PORT}/socket.io`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // 开启异步后台初始化工作 (连接测试 + 迁移)
    performBackgroundInitialization();
  });
}

async function performBackgroundInitialization() {
  try {
    logger.info('⏳ Starting background initialization (DB connection + migrations)...');
    
    // 设置全局启动标识 (可选，用于健康检查)
    app.set('isStarting', true);
    
    await testConnection();
    logger.info('✅ Database connection verified in background');
    
    if (process.env.AUTO_MIGRATE === 'true') {
      logger.info('🔧 AUTO_MIGRATE=true: running migrations in background...');
      try {
        // 使用非阻塞方式运行迁移，或如果必须同步则放在异步函数中
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        const { stdout, stderr } = await execAsync('node scripts/run-migrations.js', {
          timeout: 180000, // 3分钟超时
          cwd: path.join(__dirname),
        });
        
        if (stdout) logger.info(`[Migration STDOUT]: ${stdout}`);
        if (stderr) logger.warn(`[Migration STDERR]: ${stderr}`);
        
        logger.info('✅ Background migrations completed successfully.');
      } catch (e) {
        logger.warn('⚠️  Background migrations failed:', e.message);
        app.set('migrationError', e.message);
      }
    }
  } catch (err) {
    logger.error('❌ Background initialization failed:', err.message);
  } finally {
    app.set('isStarting', false);
    logger.info('🏁 Background initialization finished.');
  }
}

// 立即启动监听
startListening();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

