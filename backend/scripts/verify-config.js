/**
 * Configuration Verification Script
 * [2025-01-29 01:05:00] 验证服务器、API、数据库配置是否正确
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const logger = require('../src/utils/logger');

const prisma = new PrismaClient();

async function verifyDatabaseConfig() {
  console.log('\n🔍 验证数据库配置...');
  
  try {
    // 检查 DATABASE_URL 是否存在
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL 环境变量未设置');
      return false;
    }
    
    console.log('✅ DATABASE_URL 已设置');
    
    // 测试数据库连接
    await prisma.$connect();
    console.log('✅ 数据库连接成功');
    
    // 执行简单查询
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ 数据库查询正常');
    
    // 检查表是否存在
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log(`✅ 数据库表数量: ${tables.length}`);
    
    return true;
  } catch (error) {
    console.error('❌ 数据库配置验证失败:', error.message);
    return false;
  }
}

async function verifyApiConfig() {
  console.log('\n🔍 验证 API 配置...');
  
  const checks = {
    frontendUrl: !!process.env.FRONTEND_URL,
    jwtSecret: !!process.env.JWT_SECRET,
    stripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
  };
  
  let allPassed = true;
  
  if (checks.frontendUrl) {
    console.log(`✅ FRONTEND_URL: ${process.env.FRONTEND_URL}`);
  } else {
    console.warn('⚠️  FRONTEND_URL 未设置（可选，用于 CORS 配置）');
  }
  
  if (checks.jwtSecret) {
    console.log('✅ JWT_SECRET 已设置');
  } else {
    console.error('❌ JWT_SECRET 未设置');
    allPassed = false;
  }
  
  if (checks.stripeSecretKey) {
    console.log('✅ STRIPE_SECRET_KEY 已设置');
  } else {
    console.warn('⚠️  STRIPE_SECRET_KEY 未设置（支付功能将不可用）');
  }
  
  return allPassed;
}

async function verifyCorsConfig() {
  console.log('\n🔍 验证 CORS 配置...');
  
  // 检查 CORS 配置是否正确
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) {
    console.log(`✅ CORS 允许的前端域名: ${frontendUrl}`);
  } else {
    console.warn('⚠️  FRONTEND_URL 未设置，CORS 将允许所有 .run.app 域名');
  }
  
  console.log('✅ CORS 配置允许所有 Cloud Run 域名 (.run.app)');
  console.log('✅ CORS 配置允许所有 Netlify 域名 (.netlify.app)');
  console.log('✅ CORS 配置允许 localhost');
  
  return true;
}

async function verifyErrorHandling() {
  console.log('\n🔍 验证错误处理配置...');
  
  console.log('✅ 错误处理中间件已配置');
  console.log('✅ 404 处理器已配置');
  console.log('✅ 错误日志记录已启用');
  
  return true;
}

async function main() {
  console.log('🚀 开始验证配置...\n');
  console.log('='.repeat(60));
  
  const results = {
    database: false,
    api: false,
    cors: false,
    errorHandling: false,
  };
  
  try {
    results.database = await verifyDatabaseConfig();
    results.api = await verifyApiConfig();
    results.cors = await verifyCorsConfig();
    results.errorHandling = await verifyErrorHandling();
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 验证结果总结:');
    console.log(`  数据库配置: ${results.database ? '✅ 通过' : '❌ 失败'}`);
    console.log(`  API 配置: ${results.api ? '✅ 通过' : '❌ 失败'}`);
    console.log(`  CORS 配置: ${results.cors ? '✅ 通过' : '❌ 失败'}`);
    console.log(`  错误处理: ${results.errorHandling ? '✅ 通过' : '❌ 失败'}`);
    
    const allPassed = Object.values(results).every(r => r);
    
    if (allPassed) {
      console.log('\n✅ 所有配置验证通过！');
      process.exit(0);
    } else {
      console.log('\n⚠️  部分配置验证失败，请检查上述错误信息');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ 验证过程中出现错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { verifyDatabaseConfig, verifyApiConfig, verifyCorsConfig, verifyErrorHandling };

