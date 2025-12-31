// 自动创建 PostgreSQL 数据库脚本
const { Client } = require('pg');
require('dotenv').config();

async function tryConnect(config) {
  const client = new Client(config);
  try {
    await client.connect();
    await client.end();
    return true;
  } catch (error) {
    await client.end().catch(() => {});
    return false;
  }
}

async function createDatabase() {
  // 从 .env 读取配置，如果没有则使用默认值
  const baseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    database: 'postgres' // 连接到默认数据库来创建新数据库
  };

  const dbName = process.env.DB_NAME || 'suvernireplus';

  // 获取密码（从环境变量或尝试默认值）
  let password = process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD;
  
  // 如果是占位符，尝试常见默认密码
  const commonPasswords = ['postgres', '', 'admin', 'password'];
  let dbConfig = { ...baseConfig, password: password || '' };

  console.log('正在连接到 PostgreSQL...');
  console.log(`主机: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`用户: ${dbConfig.user}`);
  console.log(`要创建的数据库: ${dbName}`);

  // 如果密码是占位符或未设置，尝试常见密码
  if (!password || password === 'your_password_here') {
    console.log('\n尝试使用常见默认密码...');
    let connected = false;
    
    for (const testPassword of commonPasswords) {
      dbConfig.password = testPassword;
      if (await tryConnect(dbConfig)) {
        console.log(`✓ 连接成功（使用密码: ${testPassword || '(空)'}）`);
        password = testPassword;
        connected = true;
        break;
      }
    }
    
    if (!connected) {
      console.error('\n❌ 无法连接到 PostgreSQL');
      console.error('已尝试常见默认密码，但都失败了。');
      console.error('\n请执行以下步骤:');
      console.error('1. 编辑 backend/.env 文件');
      console.error('2. 设置 DB_PASSWORD 为你在安装 PostgreSQL 时设置的密码');
      console.error('3. 更新 DATABASE_URL 中的密码');
      console.error('4. 然后重新运行此脚本');
      return false;
    }
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✓ 已连接到 PostgreSQL');

    // 检查数据库是否已存在
    const checkDb = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (checkDb.rows.length > 0) {
      console.log(`✓ 数据库 "${dbName}" 已存在`);
    } else {
      // 创建数据库
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✓ 成功创建数据库 "${dbName}"`);
    }

    await client.end();
    console.log('\n数据库创建完成！');
    
    // 如果使用了默认密码且密码不是占位符，更新 .env 文件
    if ((!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'your_password_here') && password) {
      console.log('\n提示: 建议更新 .env 文件，将 DB_PASSWORD 设置为实际使用的密码');
    }
    
    return true;
  } catch (error) {
    console.error('\n❌ 创建数据库时出错:');
    console.error(error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.error('\n提示: 请检查 PostgreSQL 密码是否正确。');
      console.error('请编辑 backend/.env 文件，设置正确的 DB_PASSWORD');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n提示: 无法连接到 PostgreSQL 服务。');
      console.error('请确保 PostgreSQL 服务正在运行。');
    }
    
    await client.end().catch(() => {});
    return false;
  }
}

createDatabase();
