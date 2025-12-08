#!/usr/bin/env node
/**
 * 测试路由注册
 * [2025-01-27 17:00:00] 验证路由是否正确注册
 */
const app = require('./backend/src/app.js');
const http = require('http');

// 创建一个测试服务器
const server = http.createServer(app);

server.listen(0, () => {
  const port = server.address().port;
  console.log(`Test server listening on port ${port}`);
  
  // 测试路由
  const testUrl = `http://localhost:${port}/api/offline-orders/products`;
  console.log(`Testing: ${testUrl}`);
  
  const req = http.get(testUrl, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Response: ${data.substring(0, 300)}`);
      server.close();
      process.exit(res.statusCode === 200 ? 0 : 1);
    });
  });
  
  req.on('error', (e) => {
    console.error('Error:', e.message);
    server.close();
    process.exit(1);
  });
  
  req.setTimeout(5000, () => {
    console.error('Request timeout');
    req.destroy();
    server.close();
    process.exit(1);
  });
});

