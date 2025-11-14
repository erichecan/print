// [2025-11-02 20:52:00] Redis configuration for caching and sessions
const Redis = require('ioredis');
require('dotenv').config();

const redisConnectionOptions =
  process.env.REDIS_URL ||
  {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3
  };

// [2025-11-14 06:29:00] 支持 REDIS_URL 以便容器内部直接使用 redis 服务
const redis = new Redis(redisConnectionOptions);

redis.on('connect', () => {
  console.log('✅ Redis connection established successfully.');
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

// Helper functions
const getCache = async (key) => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
};

const setCache = async (key, value, ttl = 3600) => {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Redis set error:', error);
    return false;
  }
};

const deleteCache = async (key) => {
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Redis delete error:', error);
    return false;
  }
};

module.exports = {
  redis,
  getCache,
  setCache,
  deleteCache
};

