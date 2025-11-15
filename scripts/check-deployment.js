#!/usr/bin/env node
/**
 * 部署状态检查脚本
 * [2025-11-15 10:55:00] 检查前后端和数据库的连接状态
 */

const https = require('https');
const http = require('http');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

// 检查 URL 是否可访问
function checkUrl(url, timeout = 5000) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 400,
          status: res.statusCode,
          data: data.substring(0, 200), // 只取前200字符
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout',
      });
    });
  });
}

// 检查数据库连接（通过后端健康检查）
async function checkDatabase(backendUrl) {
  try {
    const healthUrl = `${backendUrl}/health`;
    const result = await checkUrl(healthUrl);
    
    if (result.success) {
      try {
        const healthData = JSON.parse(result.data);
        const dbStatus = healthData.services?.database;
        const redisStatus = healthData.services?.redis;
        
        return {
          success: true,
          status: healthData.status,
          database: dbStatus,
          redis: redisStatus,
          uptime: healthData.uptime,
          message: dbStatus === 'connected' ? 'Database connection OK' : 'Database connection failed',
        };
      } catch (e) {
        return {
          success: true,
          message: 'Backend is running (health check endpoint responded)',
        };
      }
    }
    
    return {
      success: false,
      message: result.error || `HTTP ${result.status}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
}

// 主检查函数
async function main() {
  logSection('🚀 部署状态检查');
  
  // 从环境变量或参数获取配置
  const frontendUrl = process.env.FRONTEND_URL || process.argv[2] || 'https://your-netlify-site.netlify.app';
  const backendUrl = process.env.BACKEND_URL || process.argv[3] || 'https://your-backend.onrender.com';
  
  log(`前端 URL: ${frontendUrl}`, 'blue');
  log(`后端 URL: ${backendUrl}`, 'blue');
  console.log('');

  // 1. 检查前端
  logSection('1️⃣  前端服务 (Netlify)');
  log(`检查 ${frontendUrl}...`, 'yellow');
  const frontendResult = await checkUrl(frontendUrl);
  if (frontendResult.success) {
    log(`✅ 前端服务正常 (HTTP ${frontendResult.status})`, 'green');
  } else {
    log(`❌ 前端服务不可访问: ${frontendResult.error || `HTTP ${frontendResult.status}`}`, 'red');
  }

  // 2. 检查后端
  logSection('2️⃣  后端服务 (Render)');
  log(`检查 ${backendUrl}...`, 'yellow');
  const backendResult = await checkUrl(backendUrl);
  if (backendResult.success) {
    log(`✅ 后端服务正常 (HTTP ${backendResult.status})`, 'green');
  } else {
    log(`❌ 后端服务不可访问: ${backendResult.error || `HTTP ${backendResult.status}`}`, 'red');
  }

  // 3. 检查后端 API 端点
  if (backendResult.success) {
    logSection('3️⃣  后端 API 端点');
    const apiEndpoints = [
      '/api/health',
      '/api/products',
    ];
    
    for (const endpoint of apiEndpoints) {
      const apiUrl = `${backendUrl}${endpoint}`;
      log(`检查 ${endpoint}...`, 'yellow');
      const apiResult = await checkUrl(apiUrl);
      if (apiResult.success) {
        log(`  ✅ ${endpoint} 正常`, 'green');
      } else {
        log(`  ⚠️  ${endpoint} 不可访问: ${apiResult.error || `HTTP ${apiResult.status}`}`, 'yellow');
      }
    }
  }

  // 4. 检查数据库连接
  if (backendResult.success) {
    logSection('4️⃣  数据库连接 (Neon PostgreSQL)');
    log(`通过后端健康检查检查数据库...`, 'yellow');
    const dbResult = await checkDatabase(backendUrl);
    if (dbResult.success) {
      if (dbResult.database === 'connected') {
        log(`✅ ${dbResult.message}`, 'green');
      } else {
        log(`❌ 数据库连接失败: ${dbResult.database}`, 'red');
      }
      if (dbResult.redis) {
        const redisMsg = dbResult.redis === 'connected' ? '✅ Redis 已连接' : 
                        dbResult.redis === 'not_configured' ? 'ℹ️  Redis 未配置（可选）' : 
                        '⚠️  Redis 状态异常';
        log(`   ${redisMsg}`, dbResult.redis === 'connected' ? 'green' : 'yellow');
      }
      if (dbResult.uptime) {
        const hours = Math.floor(dbResult.uptime / 3600);
        const minutes = Math.floor((dbResult.uptime % 3600) / 60);
        log(`   后端运行时间: ${hours}小时 ${minutes}分钟`, 'blue');
      }
    } else {
      log(`❌ 无法获取健康检查信息: ${dbResult.message}`, 'red');
    }
  }

  // 5. 检查前后端连接
  logSection('5️⃣  前后端连接');
  if (frontendResult.success && backendResult.success) {
    log('✅ 前后端服务都在运行', 'green');
    log('⚠️  请确认 Netlify 环境变量中设置了 NEXT_PUBLIC_API_URL', 'yellow');
    log(`   应该设置为: ${backendUrl}/api`, 'blue');
  } else {
    log('❌ 前后端连接检查失败（服务未完全启动）', 'red');
  }

  // 总结
  logSection('📊 检查总结');
  const allGood = frontendResult.success && backendResult.success;
  if (allGood) {
    log('✅ 所有服务检查通过！', 'green');
    log('\n下一步：', 'cyan');
    log('1. 确认 Netlify 环境变量 NEXT_PUBLIC_API_URL 已设置', 'blue');
    log('2. 访问前端网站测试功能', 'blue');
    log('3. 使用管理员账号登录后台测试', 'blue');
  } else {
    log('⚠️  部分服务检查失败，请检查部署状态', 'yellow');
  }
  
  console.log('');
}

// 运行检查
main().catch((error) => {
  log(`❌ 检查过程出错: ${error.message}`, 'red');
  process.exit(1);
});

