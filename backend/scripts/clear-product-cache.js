/**
 * 清除商品缓存
 * [2025-01-29 23:55:00] 清除 Redis 中的商品缓存，强制刷新图片 URL
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function clearProductCache() {
  console.log('🗑️  清除商品缓存...\n');
  
  try {
    // 使用 Redis 客户端直接删除
    const Redis = require('ioredis');
    const redisUrl = process.env.REDIS_URL || process.env.REDISCLOUD_URL || 'redis://localhost:6379';
    const redisClient = new Redis(redisUrl);
    
    // 获取所有商品缓存键
    const keys = await redisClient.keys('products:detail:*');
    console.log(`找到 ${keys.length} 个商品缓存键\n`);
    
    if (keys.length > 0) {
      // 删除所有商品缓存
      const deleted = await redisClient.del(...keys);
      console.log(`✅ 已清除 ${deleted} 个商品缓存\n`);
    } else {
      console.log('⚠️  没有找到商品缓存\n');
    }
    
    // 清除商品列表缓存
    const listKeys = await redisClient.keys('products:list:*');
    if (listKeys.length > 0) {
      const deleted = await redisClient.del(...listKeys);
      console.log(`✅ 已清除 ${deleted} 个商品列表缓存\n`);
    }
    
    await redisClient.quit();
    console.log('✨ 缓存清除完成！');
    
  } catch (error) {
    console.error('❌ 清除缓存失败:', error.message);
    console.log('\n⚠️  如果 Redis 未配置，可以等待缓存自动过期（10 分钟）');
  }
}

if (require.main === module) {
  clearProductCache()
    .catch(error => {
      console.error('❌ 执行失败:', error);
      process.exit(1);
    });
}

module.exports = { clearProductCache };

