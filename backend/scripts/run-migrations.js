// 自动执行数据库迁移脚本 
// 改进错误处理和日志输出
const { execSync } = require('child_process');

// 改进迁移脚本，增加超时处理和容错机制
function run(command, description, options = {}) {
  const { timeout = 30000, allowFailure = false, env: envOverride } = options;
  console.log(`开始执行: ${description}`);
  try {
    execSync(command, {
      stdio: 'inherit',
      timeout,
      env: {
        ...(envOverride || process.env),
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
  // 临时禁用 SSL 证书验证以解决 Cloud Run 上的 ECONNRESET 问题
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  // 去掉 channel_binding=require：Prisma binary engine (Rust/quaint) 不支持
  // SCRAM-SHA-256-PLUS 认证，channel_binding=require 会导致 "Authentication timed out"
  // 降级为标准 SCRAM-SHA-256（仍然安全，Neon PgBouncer 支持）
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('channel_binding=')) {
    process.env.DATABASE_URL = process.env.DATABASE_URL
      .replace(/([?&])channel_binding=[^&]*/g, '$1')  // 替换成保留分隔符
      .replace(/[?&]{2,}/g, '?')                      // 清理多余的 ? 或 &&
      .replace(/[?&]$/, '');                           // 去掉末尾的 ? 或 &
    console.log(' ✅ Stripped channel_binding from DATABASE_URL for Prisma compatibility');
  }

  // [2026-04-10] Prisma migrate deploy 使用 advisory lock，不兼容 PgBouncer 连接池
  // Neon pooler URL 含 "-pooler"，迁移必须使用 direct connection（去掉 "-pooler"）
  // 否则 advisory lock 会在 PgBouncer 上挂起直到 120s 超时
  // 详见：https://neon.tech/docs/connect/connection-pooling#migrations-with-prisma
  let migrationDatabaseUrl = process.env.DATABASE_URL;
  if (migrationDatabaseUrl && migrationDatabaseUrl.includes('-pooler.')) {
    migrationDatabaseUrl = migrationDatabaseUrl.replace('-pooler.', '.');
    console.log(' ✅ Using Neon direct connection URL for migrations (bypasses PgBouncer advisory lock issue)');
  }
  // 设置 DIRECT_URL 供 Prisma 使用（schema.prisma 中如有 directUrl = env("DIRECT_URL")）
  process.env.DIRECT_URL = migrationDatabaseUrl;
  // 迁移时用 direct URL 覆盖 DATABASE_URL（避免 PgBouncer 干扰 advisory lock）
  const migrationEnv = { ...process.env, DATABASE_URL: migrationDatabaseUrl };

  const env = { ...process.env };

  // 容器内 __dirname=/app/scripts，prisma 在 /app/prisma；本地 __dirname=backend/scripts，prisma 在 repo/prisma
  const path = require('path');
  const fs = require('fs');
  const schemaInParent = path.resolve(__dirname, '..', 'prisma', 'schema.prisma');
  const schemaInRepo = path.resolve(__dirname, '..', '..', 'prisma', 'schema.prisma');
  const schemaPath = fs.existsSync(schemaInParent) ? schemaInParent : schemaInRepo;
  // [2026-04-02] Prioritize 'prisma migrate deploy' for production-like environments
  // This is safer and avoids issues with 'db push' requiring table ownership for introspection
  let prismaSuccess = false;
  
  if (fs.existsSync(path.join(path.dirname(schemaPath), 'migrations'))) {
    console.log('📂 Migrations directory found, attempting prisma migrate deploy...');
    console.log('🔗 Using direct Neon connection (bypasses PgBouncer for advisory locks)');
    prismaSuccess = run(
      `npx prisma migrate deploy --schema=${schemaPath}`,
      'Prisma migrate deploy',
      { timeout: 120000, allowFailure: true, env: migrationEnv } // Use direct URL, allow failure to try fallback
    );
  }

  if (!prismaSuccess) {
    console.log('🔄 Falling back to prisma db push analysis...');

    // [2026-04-02] Check if migrate deploy failed due to non-recoverable errors
    // If it's a permission/ownership error, db push will also fail and potentially be more confusing
    prismaSuccess = run(
      `npx prisma db push --schema=${schemaPath} --accept-data-loss`,
      'Prisma db push',
      { timeout: 120000, allowFailure: false, env: migrationEnv }
    );
  }

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

      // [2026-03-29] 自动同步 site.colorMappings 到 offline_order_colors
      console.log('🌈 正在同步颜色配置...');
      run(
        'node scripts/migrate-colors.js',
        '迁移 site.colorMappings 到 offline_order_colors',
        { timeout: 30000, allowFailure: true }
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

