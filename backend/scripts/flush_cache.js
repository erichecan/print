const Redis = require('ioredis');
require('dotenv').config({ path: '../.env' }); // Load env from backend root

async function main() {
    console.log('🧹 Flushing Redis Cache (with ioredis)...');

    // Connect to Redis
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const redis = new Redis(url);

    try {
        await redis.flushall();
        console.log('✅ Redis Cache Flushed (FLUSHALL).');
    } catch (e) {
        console.error('Error flushing redis:', e);
    } finally {
        await redis.quit();
    }
}

main();
