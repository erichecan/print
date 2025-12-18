/**
 * 诊断登录 500 错误
 * [2025-12-18 16:20:00] 检查前端环境变量和后端服务器连接
 */
const https = require('https');
const http = require('http');

const BACKEND_URL = 'https://print-main-backend-234065158862.us-central1.run.app';
const BACKEND_API_URL = `${BACKEND_URL}/api`;
const FRONTEND_URL = 'https://print-main-frontend-234065158862.us-central1.run.app';

console.log('🔍 诊断登录 500 错误...\n');

// 1. 检查后端服务器健康状态
console.log('1️⃣ 检查后端服务器健康状态...');
const checkBackendHealth = () => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BACKEND_URL}/health`);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      timeout: 5000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`   ✅ 后端服务器响应: ${res.statusCode}`);
        if (res.statusCode === 200) {
          console.log(`   📄 响应内容: ${data.substring(0, 100)}`);
        }
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.error(`   ❌ 后端服务器连接失败: ${error.message}`);
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('   ❌ 后端服务器连接超时');
      reject(new Error('Connection timeout'));
    });

    req.end();
  });
};

// 2. 测试登录 API 端点
console.log('\n2️⃣ 测试登录 API 端点...');
const testLoginEndpoint = () => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BACKEND_API_URL}/auth/login`);
    const postData = JSON.stringify({
      email: 'test@example.com',
      password: 'test123456',
    });

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`   📊 登录 API 响应状态: ${res.statusCode}`);
        try {
          const json = JSON.parse(data);
          console.log(`   📄 响应内容: ${JSON.stringify(json, null, 2)}`);
        } catch (e) {
          console.log(`   📄 响应内容（原始）: ${data.substring(0, 200)}`);
        }
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.error(`   ❌ 登录 API 请求失败: ${error.message}`);
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('   ❌ 登录 API 请求超时');
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
};

// 3. 检查环境变量配置建议
console.log('\n3️⃣ 环境变量配置检查...');
console.log('   前端服务需要配置以下环境变量：');
console.log(`   NEXT_PUBLIC_API_URL=${BACKEND_API_URL}`);
console.log('   或者通过 Secret Manager 配置：');
console.log('   NEXT_PUBLIC_API_URL=api-url:latest (Secret Manager)');
console.log('\n   后端服务需要配置以下 Secrets：');
console.log('   - DATABASE_URL (Secret Manager)');
console.log('   - JWT_SECRET (Secret Manager)');
console.log('   - STRIPE_SECRET_KEY (Secret Manager)');

// 执行诊断
(async () => {
  try {
    await checkBackendHealth();
    await testLoginEndpoint();
    
    console.log('\n✅ 诊断完成！');
    console.log('\n📋 修复建议：');
    console.log('1. 检查前端 Cloud Run 服务的环境变量配置');
    console.log('2. 确保 NEXT_PUBLIC_API_URL 指向正确的后端 API 地址');
    console.log('3. 检查后端服务器日志，查看具体的 500 错误原因');
    console.log('4. 验证后端数据库连接和 JWT_SECRET 配置');
  } catch (error) {
    console.error('\n❌ 诊断过程中出现错误:', error.message);
    process.exit(1);
  }
})();

