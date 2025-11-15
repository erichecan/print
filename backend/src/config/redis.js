// [2025-11-02 20:52:00] Redis configuration for caching and sessions
// [2025-11-15 10:50:00] 修改为可选连接，避免在没有 Redis 时持续报错
const Redis = require('ioredis');
require('dotenv').config();

let redis = null;
let redisEnabled = false;
let lastErrorTime = 0;
const ERROR_LOG_INTERVAL = 60000; // 只每60秒打印一次错误日志

// 检查是否配置了 Redis
const hasRedisConfig = process.env.REDIS_URL || process.env.REDIS_HOST;

if (hasRedisConfig) {
  const redisConnectionOptions =
    process.env.REDIS_URL ||
    {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        // 限制重试次数，避免无限重试
        if (times > 10) {
          return null; // 停止重试
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false, // 禁用离线队列，避免错误累积
      lazyConnect: true // 延迟连接，避免启动时立即连接
    };

  // [2025-11-14 06:29:00] 支持 REDIS_URL 以便容器内部直接使用 redis 服务
  redis = new Redis(redisConnectionOptions);

  redis.on('connect', () => {
    redisEnabled = true;
    console.log('✅ Redis connection established successfully.');
  });

  redis.on('error', (error) => {
    const now = Date.now();
    // 只每60秒打印一次错误日志，避免日志刷屏
    if (now - lastErrorTime > ERROR_LOG_INTERVAL) {
      console.warn('⚠️  Redis connection error (will retry silently):', error.message);
      lastErrorTime = now;
    }
    redisEnabled = false;
  });

  redis.on('close', () => {
    redisEnabled = false;
  });

  // 尝试连接，但不阻塞应用启动
  redis.connect().catch(() => {
    // 静默处理连接失败，应用可以在没有 Redis 的情况下运行
    redisEnabled = false;
  });
} else {
  console.log('ℹ️  Redis not configured, caching disabled.');
}

// Helper functions
// [2025-11-15 10:50:00] 修改为检查 Redis 是否可用，不可用时优雅降级
const getCache = async (key) => {
  if (!redis || !redisEnabled) {
    return null;
  }
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    // 静默处理错误，返回 null 表示缓存未命中
    return null;
  }
};

const setCache = async (key, value, ttl = 3600) => {
  if (!redis || !redisEnabled) {
    return false;
  }
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    // 静默处理错误，返回 false 表示缓存设置失败
    return false;
  }
};

const deleteCache = async (key) => {
  if (!redis || !redisEnabled) {
    return false;
  }
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    // 静默处理错误，返回 false 表示缓存删除失败
    return false;
  }
};

// [2025-11-15 10:50:00] 添加 keys 方法的包装，用于管理员清除缓存
const getRedisKeys = async (pattern) => {
  if (!redis || !redisEnabled) {
    return [];
  }
  try {
    return await redis.keys(pattern);
  } catch (error) {
    return [];
  }
};

// [2025-11-15 10:50:00] 导出 mock redis 对象，用于管理员清除缓存功能
const mockRedis = {
  keys: async () => [],
  del: async () => 0
};

module.exports = {
  redis: redis || mockRedis, // 如果没有 Redis，提供 mock 对象
  getCache,
  setCache,
  deleteCache,
  getRedisKeys // 新增方法，用于安全地获取 keys
};

