// Database configuration using Sequelize
const { Sequelize } = require('sequelize');
const { URL } = require('url');
require('dotenv').config();

// 从 DATABASE_URL 解析数据库连接参数（用于 Sequelize CLI）
function parseDatabaseUrl(databaseUrl) {
  if (!databaseUrl) return null;

  try {
    const url = new URL(databaseUrl);
    return {
      username: url.username || '',
      password: url.password || '',
      host: url.hostname || '',
      port: url.port || '5432',
      database: url.pathname ? url.pathname.slice(1) : '', // 移除前导斜杠
    };
  } catch (error) {
    console.warn('⚠️  Failed to parse DATABASE_URL:', error.message);
    return null;
  }
}

// 为 Sequelize/pg 清理 URL，只去掉 channel_binding 参数（保留 sslmode 等其他参数）
// 原因：channel_binding=require 在 Node.js 20 + PgBouncer 组合下会导致
// SCRAM-SHA-256-PLUS 认证失败（pg 库不支持 channel binding）
// sslmode=require 必须保留，否则 Neon PgBouncer 会在 TLS 握手前断开连接（ECONNRESET）
// SSL rejectUnauthorized 由 dialectOptions.ssl 显式控制
function cleanUrlForSequelize(databaseUrl) {
  if (!databaseUrl || databaseUrl.includes('host=/cloudsql/')) {
    // Cloud SQL socket URL 或空 URL 不处理
    return databaseUrl;
  }
  try {
    // 只去掉 channel_binding 参数，保留 sslmode 等其他参数
    if (!databaseUrl.includes('channel_binding=')) {
      return databaseUrl; // 没有 channel_binding，直接返回原 URL
    }
    const cleaned = databaseUrl
      .replace(/([?&])channel_binding=[^&]*/g, '$1')  // 替换成保留分隔符
      .replace(/[?&]{2,}/g, '?')                       // 清理多余的 ? 或 &&
      .replace(/[?&]$/, '');                            // 去掉末尾的 ? 或 &
    return cleaned;
  } catch (e) {
    return databaseUrl;
  }
}

// 解析 DATABASE_URL（如果存在）以支持 Render/Neon 等平台
const dbUrlParts = parseDatabaseUrl(process.env.DATABASE_URL);

// Configuration for Sequelize CLI
const config = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'suvernireplus',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME + '_test' || 'suvernireplus_test',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  },
  production: {
// 优先使用 DATABASE_URL 解析的值，否则使用单独的环境变量
    username: dbUrlParts?.username || process.env.DB_USER,
    password: dbUrlParts?.password || process.env.DB_PASSWORD,
    database: dbUrlParts?.database || process.env.DB_NAME,
    host: dbUrlParts?.host || process.env.DB_HOST,
    port: parseInt(dbUrlParts?.port || process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: false,
    // 2026-03-06: Cloud SQL 通过 Unix socket (host=/cloudsql/...) 连接时不启用 SSL，避免 \"The server does not support SSL connections\"
    dialectOptions: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('host=/cloudsql/')
      ? {}
      : {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
  }
};

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// 支持 DATABASE_URL 一键连接（Render/Neon/Heroku），否则回退到分字段配置
let sequelize;
if (process.env.DATABASE_URL) {
  // 去掉 channel_binding/sslmode 等 URL 参数，由 dialectOptions.ssl 统一控制
  // 避免 Node.js 20 + PgBouncer 下 channel_binding=require 触发 ECONNRESET
  const seqUrl = cleanUrlForSequelize(process.env.DATABASE_URL);
  console.log(' 🔗 Sequelize URL host:', seqUrl.split('@')[1]?.split('/')[0] || '(cloud-sql-socket)');
  sequelize = new Sequelize(seqUrl, {
    dialect: 'postgres',
    logging: dbConfig.logging,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    define: { timestamps: true, underscored: true, freezeTableName: false },
    // 2026-03-06: 复用上面的 dialectOptions 配置，Cloud SQL socket 不启用 SSL
    dialectOptions: dbConfig.dialectOptions || {},
  });
} else {
  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      port: dbConfig.port,
      dialect: dbConfig.dialect,
      logging: dbConfig.logging,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: false
      },
      ...(dbConfig.dialectOptions || {})
    }
  );
}

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

// Export for Sequelize CLI
module.exports = config;

// Also export sequelize instance for direct use
module.exports.sequelize = sequelize;
module.exports.testConnection = testConnection;

