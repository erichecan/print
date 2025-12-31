// 自动运行 seed 数据脚本（包括 admin 用户）
// 用于 GCP 部署后确保 seed 数据已创建
const { execSync } = require('child_process');
const logger = require('../src/utils/logger');

async function runSeed() {
  try {
    logger.info('🌱 开始运行 seed 数据...');
    
    // 运行 Sequelize seed
    logger.info('📦 运行 Sequelize seed...');
    try {
      execSync('npx sequelize-cli db:seed:all', {
        stdio: 'inherit',
        timeout: 60000, // 60秒超时
        env: {
          ...process.env,
        },
      });
      logger.info('✅ Sequelize seed 完成');
    } catch (seedError) {
      logger.warn('⚠️  Sequelize seed 失败（可能数据已存在）:', seedError.message);
      // 继续执行，可能数据已经存在
    }
    
// 也可以运行 Prisma seed（如果存在）
    try {
      logger.info('📦 运行 Prisma seed...');
      execSync('npx prisma db seed --schema=./prisma/schema.prisma', {
        stdio: 'inherit',
        timeout: 60000,
        env: {
          ...process.env,
        },
      });
      logger.info('✅ Prisma seed 完成');
    } catch (prismaSeedError) {
      logger.warn('⚠️  Prisma seed 失败或未配置:', prismaSeedError.message);
      // 继续执行
    }
    
    logger.info('✅ Seed 数据运行完成');
  } catch (error) {
    logger.error('❌ Seed 数据运行失败:', error.message);
    logger.warn('⚠️  服务器将继续启动，但可能需要手动运行 seed');
    // 不退出，让服务器继续启动
  }
}

runSeed();

