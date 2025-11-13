// 自动执行数据库迁移脚本 [2025-11-10 14:02:00]
const { execSync } = require('child_process');

function run(command, description) {
  console.log(`开始执行: ${description}`);
  execSync(command, { stdio: 'inherit' });
}

try {
  run('npx prisma migrate deploy', 'Prisma migrate deploy');
  run('npx sequelize-cli db:migrate', 'Sequelize CLI migrate');
  console.log('所有迁移已成功执行 [2025-11-10 14:02:00]');
} catch (error) {
  console.error('迁移执行失败，请检查日志 [2025-11-10 14:02:00]');
  process.exit(1);
}

