#!/usr/bin/env node
/**
 * 测试前后端 API 连接
 * [2025-11-15 11:15:00]
 */

const https = require('https');

const FRONTEND_URL = 'https://souvenirplus.netlify.app';
const BACKEND_URL = 'https://print-mnmz.onrender.com';
const API_BASE_URL = `${BACKEND_URL}/api`;

console.log('🔍 测试前后端 API 连接\n');
console.log(`前端: ${FRONTEND_URL}`);
console.log(`后端 API: ${API_BASE_URL}\n`);

function testApi(endpoint, description) {
  return new Promise((resolve) => {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`测试: ${description}`);
    console.log(`  URL: ${url}`);
    
    const req = https.get(url, {
      headers: {
        'Origin': FRONTEND_URL,
        'Accept': 'application/json',
      },
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const success = res.statusCode >= 200 && res.statusCode < 400;
        console.log(`  状态: ${res.statusCode} ${success ? '✅' : '❌'}`);
        
        // 检查 CORS headers
        const corsOrigin = res.headers['access-control-allow-origin'];
        if (corsOrigin) {
          console.log(`  CORS: ${corsOrigin} ${corsOrigin === FRONTEND_URL ? '✅' : '⚠️'}`);
        }
        
        if (success) {
          try {
            const json = JSON.parse(data);
            if (json.data !== undefined) {
              console.log(`  数据: 返回 ${Array.isArray(json.data) ? json.data.length : 'object'} 项`);
            }
          } catch (e) {
            // 不是 JSON，忽略
          }
        } else {
          console.log(`  错误: ${data.substring(0, 100)}`);
        }
        
        console.log('');
        resolve(success);
      });
    });

    req.on('error', (error) => {
      console.log(`  错误: ${error.message} ❌\n`);
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`  超时 ❌\n`);
      resolve(false);
    });
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('1. 测试产品列表 API');
  console.log('='.repeat(60));
  const productsOk = await testApi('/products?limit=1', '获取产品列表');

  console.log('='.repeat(60));
  console.log('2. 测试分类列表 API');
  console.log('='.repeat(60));
  const collectionsOk = await testApi('/collections', '获取分类列表');

  console.log('='.repeat(60));
  console.log('3. 测试健康检查');
  console.log('='.repeat(60));
  const healthOk = await testApi('/health', '健康检查（注意：这是 /api/health，不是 /health）');

  console.log('='.repeat(60));
  console.log('📊 测试总结');
  console.log('='.repeat(60));
  console.log(`产品 API: ${productsOk ? '✅ 正常' : '❌ 失败'}`);
  console.log(`分类 API: ${collectionsOk ? '✅ 正常' : '❌ 失败'}`);
  console.log(`健康检查: ${healthOk ? '✅ 正常' : '⚠️  注意：健康检查在 /health，不在 /api/health'}`);
  
  console.log('\n💡 配置检查：');
  console.log(`  Netlify 环境变量 NEXT_PUBLIC_API_URL 应该设置为: ${API_BASE_URL}`);
  console.log(`  如果配置正确，前端会调用: ${API_BASE_URL}/products`);
  console.log(`  后端路由是: /api/products`);
  console.log(`  最终 URL: ${BACKEND_URL}/api/products ✅\n`);
  
  if (productsOk && collectionsOk) {
    console.log('✅ 所有 API 测试通过！前后端连接正常。');
  } else {
    console.log('⚠️  部分 API 测试失败，请检查配置。');
  }
}

main().catch(console.error);

