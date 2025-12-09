#!/usr/bin/env node
/**
 * 路由连通性 Smoke Test
 * [2025-12-09] 测试商品列表与详情页路由是否可访问
 * 
 * 使用方法：
 * - 本地测试: node scripts/smoke-routes.mjs
 * - 指定 URL: APP_BASE=http://localhost:3000 node scripts/smoke-routes.mjs
 */

const base = process.env.APP_BASE || 'http://localhost:3000';

const routes = [
  { path: '/products', name: '商品列表页' },
  { path: '/products?page=1&limit=12', name: '商品列表页（带分页）' },
  { path: '/products/test-slug', name: '商品详情页（测试 slug）' },
  { path: '/api/products', name: '商品列表 API' },
  { path: '/api/products?page=1&limit=12', name: '商品列表 API（带参数）' },
  { path: '/api/products/test-slug', name: '商品详情 API（测试 slug）' },
];

async function testRoute(url, name) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 秒超时
    
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual', // 不自动跟随重定向
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const status = response.status;
    const location = response.headers.get('location') || '';
    const contentType = response.headers.get('content-type') || '';
    
    // 判断结果
    let result = '❌';
    let statusText = '';
    
    if (status >= 200 && status < 300) {
      result = '✅';
      statusText = '成功';
    } else if (status >= 300 && status < 400) {
      result = '⚠️';
      statusText = `重定向到: ${location}`;
    } else if (status === 404) {
      result = '❌';
      statusText = '404 未找到';
    } else if (status >= 500) {
      result = '❌';
      statusText = '服务器错误';
    } else {
      result = '⚠️';
      statusText = `状态码: ${status}`;
    }
    
    console.log(`${result} ${name}`);
    console.log(`    URL: ${url}`);
    console.log(`    状态: ${status} ${statusText}`);
    if (contentType) {
      console.log(`    类型: ${contentType}`);
    }
    if (location) {
      console.log(`    重定向: ${location}`);
    }
    console.log('');
    
    return { success: status >= 200 && status < 300, status, url, name };
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`⏱️  ${name}`);
      console.log(`    URL: ${url}`);
      console.log(`    错误: 请求超时（10秒）`);
      console.log('');
      return { success: false, status: 'TIMEOUT', url, name };
    } else {
      console.log(`❌ ${name}`);
      console.log(`    URL: ${url}`);
      console.log(`    错误: ${error.message}`);
      console.log('');
      return { success: false, status: 'ERROR', url, name, error: error.message };
    }
  }
}

async function main() {
  console.log('🚀 开始路由连通性测试');
  console.log(`📍 测试基础 URL: ${base}`);
  console.log('');
  
  const results = [];
  
  for (const route of routes) {
    const url = `${base}${route.path}`;
    const result = await testRoute(url, route.name);
    results.push(result);
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // 汇总结果
  console.log('='.repeat(60));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`总计: ${totalCount} 个路由`);
  console.log(`成功: ${successCount} 个`);
  console.log(`失败: ${totalCount - successCount} 个`);
  console.log('');
  
  if (successCount === totalCount) {
    console.log('✅ 所有路由测试通过！');
    process.exit(0);
  } else {
    console.log('❌ 部分路由测试失败，请检查上述错误信息');
    console.log('');
    console.log('失败的路由:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  - ${r.name}: ${r.url} (${r.status})`);
      });
    process.exit(1);
  }
}

main().catch(error => {
  console.error('测试脚本执行失败:', error);
  process.exit(1);
});

