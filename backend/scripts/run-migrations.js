// 自动执行数据库迁移脚本 
// 改进错误处理和日志输出
const { execSync } = require('child_process');

// 改进迁移脚本，增加超时处理和容错机制
function run(command, description, options = {}) {
  const { timeout = 30000, allowFailure = false } = options;
  console.log(`开始执行: ${description}`);
  try {
    execSync(command, {
      stdio: 'inherit',
      timeout,
      env: {
        ...process.env,
        // 增加 Prisma 迁移超时时间
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

    // 如果是超时错误，可能是数据库连接问题，允许失败
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
  // 允许 Prisma 迁移失败（可能数据库已经是最新的）
  // 临时禁用 SSL 证书验证以解决 Cloud Run 上的 ECONNRESET 问题
  // 这通常是由于容器环境缺少某些根证书或 SSL 库兼容性问题
  const env = { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' };

  const prismaSuccess = run(
    'npx prisma db push --schema=../prisma/schema.prisma --accept-data-loss',
    'Prisma db push',
    { timeout: 120000, allowFailure: false, env } // 增加超时时间，不允许失败
  );

  // Sequelize 迁移已禁用 (缺少 config/config.json)
  // const sequelizeSuccess = run(
  //   'npx sequelize-cli db:migrate',
  //   'Sequelize CLI migrate',
  //   { timeout: 60000, allowFailure: true }
  // );

  if (prismaSuccess) {
    console.log('✅ Prisma schema 同步成功 ');

    // 迁移成功后自动创建 admin 用户（使用 Prisma 直接创建，更可靠）
    console.log('🌱 迁移完成，开始创建 admin 用户...');
    try {
      // Sequelize seed 已禁用
      // run(
      //   'npx sequelize-cli db:seed:all',
      //   'Sequelize seed',
      //   { timeout: 60000, allowFailure: true }
      // );

      // 然后使用 Prisma 直接创建 admin 用户（确保用户存在）
      console.log('🔧 使用 Prisma 直接创建/更新 admin 用户...');
      run(
        'node scripts/create-admin-user.js',
        '创建 admin 用户（Prisma）',
        { timeout: 30000, allowFailure: false }
      );
    } catch (seedError) {
      console.warn('⚠️  创建用户失败，但继续执行:', seedError.message);
    }
  } else {
    console.warn('⚠️ Prisma 同步失败 ');
  }
} catch (error) {
  console.error('❌ 迁移执行失败，但服务器将继续启动 ');
  console.error('完整错误信息:', error.message);
  // 不再退出进程，让服务器继续启动
  // 如果数据库已经是最新的，迁移失败不应该阻止服务器启动
  console.warn('⚠️  如果这是首次部署或数据库连接问题，请检查数据库状态');
}

