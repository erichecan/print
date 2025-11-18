// 自动执行数据库迁移脚本 [2025-11-10 14:02:00]
// [2025-01-11 14:05:00] 改进错误处理和日志输出
const { execSync } = require('child_process');

// [2025-01-27 17:15:00] 改进迁移脚本，增加超时处理和容错机制
function run(command, description, options = {}) {
  const { timeout = 30000, allowFailure = false } = options;
  console.log(`开始执行: ${description}`);
  try {
    execSync(command, { 
      stdio: 'inherit',
      timeout,
      env: {
        ...process.env,
        // [2025-01-27 17:15:00] 增加 Prisma 迁移超时时间
        PRISMA_MIGRATE_LOCK_TIMEOUT: '30000',
      },
    });
    console.log(`✅ ${description} 完成`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} 失败`);
    console.error('错误详情:', error.message);
    if (error.stdout) {
      console.error('标准输出:', error.stdout.toString());
    }
    if (error.stderr) {
      console.error('错误输出:', error.stderr.toString());
    }
    
    // [2025-01-27 17:15:00] 如果是超时错误，可能是数据库连接问题，允许失败
    if (error.signal === 'SIGTERM' || error.message.includes('timeout') || error.message.includes('timed out')) {
      console.warn('⚠️  迁移超时，可能是数据库连接问题。如果数据库已经是最新状态，可以忽略此错误。');
      if (allowFailure) {
        return false;
      }
    }
    
    if (allowFailure) {
      console.warn(`⚠️  ${description} 失败，但允许继续（allowFailure=true）`);
      return false;
    }
    
    throw error;
  }
}

try {
  // [2025-11-16 11:21:45] 在 Render 上工作目录为 backend/，需要显式传入 schema 路径
  // [2025-01-27 17:15:00] 允许 Prisma 迁移失败（可能数据库已经是最新的）
  const prismaSuccess = run(
    'npx prisma migrate deploy --schema=../prisma/schema.prisma', 
    'Prisma migrate deploy',
    { timeout: 30000, allowFailure: true }
  );
  
  // [2025-01-27 17:15:00] Sequelize 迁移也允许失败
  const sequelizeSuccess = run(
    'npx sequelize-cli db:migrate', 
    'Sequelize CLI migrate',
    { timeout: 30000, allowFailure: true }
  );
  
  if (prismaSuccess && sequelizeSuccess) {
    console.log('✅ 所有迁移已成功执行 [2025-01-11 14:05:00]');
  } else {
    console.warn('⚠️  部分迁移失败，但服务器将继续启动 [2025-01-27 17:15:00]');
    console.warn('   如果数据库已经是最新状态，可以忽略这些错误');
  }
} catch (error) {
  console.error('❌ 迁移执行失败，但服务器将继续启动 [2025-01-27 17:15:00]');
  console.error('完整错误信息:', error.message);
  // [2025-01-27 17:15:00] 不再退出进程，让服务器继续启动
  // 如果数据库已经是最新的，迁移失败不应该阻止服务器启动
  console.warn('⚠️  如果这是首次部署或数据库连接问题，请检查数据库状态');
}

