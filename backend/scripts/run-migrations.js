// 自动执行数据库迁移脚本 [2025-11-10 14:02:00]
// [2025-01-11 14:05:00] 改进错误处理和日志输出
const { execSync } = require('child_process');

function run(command, description) {
  console.log(`开始执行: ${description}`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} 完成`);
  } catch (error) {
    console.error(`❌ ${description} 失败`);
    console.error('错误详情:', error.message);
    if (error.stdout) {
      console.error('标准输出:', error.stdout.toString());
    }
    if (error.stderr) {
      console.error('错误输出:', error.stderr.toString());
    }
    throw error;
  }
}

try {
  // [2025-11-16 11:21:45] 在 Render 上工作目录为 backend/，需要显式传入 schema 路径
  run('npx prisma migrate deploy --schema=../prisma/schema.prisma', 'Prisma migrate deploy');
  run('npx sequelize-cli db:migrate', 'Sequelize CLI migrate');
  console.log('✅ 所有迁移已成功执行 [2025-01-11 14:05:00]');
} catch (error) {
  console.error('❌ 迁移执行失败，请检查日志 [2025-01-11 14:05:00]');
  console.error('完整错误信息:', error);
  process.exit(1);
}

