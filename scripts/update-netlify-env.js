#!/usr/bin/env node
/**
 * Netlify 环境变量更新脚本
 * [2025-11-15 11:45:00] 通过 Netlify API 更新站点环境变量
 * 
 * 使用方法:
 *   node scripts/update-netlify-env.js <SITE_ID> <VARIABLE_KEY> <VARIABLE_VALUE> [NETLIFY_TOKEN]
 * 
 * 示例:
 *   node scripts/update-netlify-env.js souvenirplus NEXT_PUBLIC_API_URL "https://print-mnmz.onrender.com/api"
 * 
 * 环境变量:
 *   NETLIFY_AUTH_TOKEN - Netlify Personal Access Token (可选，也可以通过参数传入)
 */

const https = require('https');

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

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// 解析命令行参数
const args = process.argv.slice(2);

if (args.length < 3) {
  error('参数不足！');
  console.log('\n使用方法:');
  console.log('  node scripts/update-netlify-env.js <SITE_ID> <VARIABLE_KEY> <VARIABLE_VALUE> [NETLIFY_TOKEN]');
  console.log('\n示例:');
  console.log('  node scripts/update-netlify-env.js souvenirplus NEXT_PUBLIC_API_URL "https://print-mnmz.onrender.com/api"');
  console.log('\n或者设置环境变量:');
  console.log('  export NETLIFY_AUTH_TOKEN=your_token_here');
  console.log('  node scripts/update-netlify-env.js souvenirplus NEXT_PUBLIC_API_URL "https://print-mnmz.onrender.com/api"');
  process.exit(1);
}

const [siteId, variableKey, variableValue, tokenArg] = args;
const netlifyToken = tokenArg || process.env.NETLIFY_AUTH_TOKEN;

if (!netlifyToken) {
  error('未提供 Netlify Personal Access Token！');
  console.log('\n请通过以下方式之一提供 Token:');
  console.log('  1. 作为命令行参数: node scripts/update-netlify-env.js <SITE_ID> <KEY> <VALUE> <TOKEN>');
  console.log('  2. 作为环境变量: export NETLIFY_AUTH_TOKEN=your_token_here');
  console.log('\n如何获取 Token:');
  console.log('  1. 访问 https://app.netlify.com/user/applications');
  console.log('  2. 点击 "New access token"');
  console.log('  3. 输入描述并生成 Token');
  console.log('  4. 复制 Token（只显示一次）');
  process.exit(1);
}

// API 基础 URL
const API_BASE = 'api.netlify.com';
const API_VERSION = 'v1';

// 发送 HTTP 请求
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: API_BASE,
      port: 443,
      path: `/api/${API_VERSION}${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${netlifyToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Netlify-Env-Updater/1.0',
      },
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data: parsed });
          } else {
            reject({
              statusCode: res.statusCode,
              message: parsed.message || parsed.error || `HTTP ${res.statusCode}`,
              data: parsed,
            });
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data: responseData });
          } else {
            reject({
              statusCode: res.statusCode,
              message: responseData || `HTTP ${res.statusCode}`,
            });
          }
        }
      });
    });

    req.on('error', (e) => {
      reject({ message: e.message });
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

// 获取站点信息
async function getSite(siteId) {
  try {
    info(`正在获取站点信息: ${siteId}...`);
    const response = await makeRequest('GET', `/sites/${siteId}`);
    return response.data;
  } catch (err) {
    if (err.statusCode === 404) {
      error(`站点 "${siteId}" 不存在或无法访问`);
    } else if (err.statusCode === 401) {
      error('认证失败！请检查你的 Personal Access Token 是否正确');
    } else {
      error(`获取站点信息失败: ${err.message}`);
    }
    throw err;
  }
}

// 获取当前环境变量
async function getEnvVars(siteId) {
  try {
    info('正在获取当前环境变量...');
    const response = await makeRequest('GET', `/sites/${siteId}/env`);
    return response.data;
  } catch (err) {
    if (err.statusCode === 404) {
      error(`站点 "${siteId}" 不存在或无法访问`);
    } else {
      error(`获取环境变量失败: ${err.message}`);
    }
    throw err;
  }
}

// 更新环境变量
async function updateEnvVar(siteId, key, value) {
  try {
    info(`正在更新环境变量: ${key} = ${value}...`);
    
    // 使用 PUT 方法更新环境变量
    // 注意：key 需要 URL 编码
    const encodedKey = encodeURIComponent(key);
    const response = await makeRequest('PUT', `/sites/${siteId}/env/${encodedKey}`, {
      key: key,
      values: [
        {
          value: value,
          context: 'all', // all, dev, branch-deploy, deploy-preview, production
        }
      ],
    });
    
    return response.data;
  } catch (err) {
    if (err.statusCode === 404) {
      error(`站点 "${siteId}" 不存在或环境变量 "${key}" 不存在`);
    } else if (err.statusCode === 401) {
      error('认证失败！请检查你的 Personal Access Token 是否正确');
    } else if (err.statusCode === 403) {
      error('权限不足！请确保你的 Token 有修改环境变量的权限');
    } else {
      error(`更新环境变量失败: ${err.message}`);
      if (err.data) {
        console.error('错误详情:', JSON.stringify(err.data, null, 2));
      }
    }
    throw err;
  }
}

// 主函数
async function main() {
  try {
    log('\n🚀 Netlify 环境变量更新工具\n', 'blue');
    
    // 获取站点信息
    const site = await getSite(siteId);
    success(`站点找到: ${site.name} (${site.url})`);
    
    // 获取当前环境变量
    const envVars = await getEnvVars(siteId);
    const existingVar = envVars.find(v => v.key === variableKey);
    
    if (existingVar) {
      warning(`环境变量 "${variableKey}" 已存在`);
      console.log(`  当前值: ${existingVar.values.map(v => `${v.value} (${v.context})`).join(', ')}`);
    } else {
      info(`环境变量 "${variableKey}" 不存在，将创建新变量`);
    }
    
    // 更新环境变量
    const result = await updateEnvVar(siteId, variableKey, variableValue);
    
    success(`环境变量 "${variableKey}" 已成功更新！`);
    console.log(`  新值: ${variableValue}`);
    console.log(`  作用域: all (所有环境)`);
    
    log('\n📝 下一步:', 'yellow');
    console.log('  1. 环境变量已更新，但需要重新部署才能生效');
    console.log('  2. 在 Netlify Dashboard 中触发重新部署:');
    console.log(`     https://app.netlify.com/sites/${siteId}/deploys`);
    console.log('  3. 或者等待下一次自动部署');
    
    log('\n✅ 完成！\n', 'green');
    
  } catch (err) {
    error('操作失败！');
    console.error(err);
    process.exit(1);
  }
}

// 运行主函数
main();

