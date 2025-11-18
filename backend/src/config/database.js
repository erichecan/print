// [2025-11-02 20:52:00] Database configuration using Sequelize
const { Sequelize } = require('sequelize');
const { URL } = require('url');
require('dotenv').config();

// [2025-01-11 14:05:00] 从 DATABASE_URL 解析数据库连接参数（用于 Sequelize CLI）
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

// [2025-01-11 14:05:00] 解析 DATABASE_URL（如果存在）以支持 Render/Neon 等平台
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
    // [2025-01-11 14:05:00] 优先使用 DATABASE_URL 解析的值，否则使用单独的环境变量
    username: dbUrlParts?.username || process.env.DB_USER,
    password: dbUrlParts?.password || process.env.DB_PASSWORD,
    database: dbUrlParts?.database || process.env.DB_NAME,
    host: dbUrlParts?.host || process.env.DB_HOST,
    port: parseInt(dbUrlParts?.port || process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// [2025-11-16 16:40:00] 支持 DATABASE_URL 一键连接（Render/Neon/Heroku），否则回退到分字段配置
let sequelize;
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: dbConfig.logging,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    define: { timestamps: true, underscored: true, freezeTableName: false },
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
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

