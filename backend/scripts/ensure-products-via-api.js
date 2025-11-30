/**
 * [2025-01-29 22:30:00] 通过 API 检查和确保商品数据存在
 * 如果商品数据不存在，提供修复建议
 */
const https = require('https');

const BACKEND_URL = process.env.API_BASE_URL || 'https://print-main-backend-234065158862.us-central1.run.app';

async function checkProducts() {
  return new Promise((resolve, reject) => {
    const url = `${BACKEND_URL}/api/products?limit=1&includeOutOfStock=true`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function runSeed() {
  return new Promise((resolve, reject) => {
    const url = `${BACKEND_URL}/api/admin-setup/seed`;
    const postData = JSON.stringify({});
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('🔍 检查 GCP 环境中的商品数据...');
  console.log(`Backend URL: ${BACKEND_URL}\n`);
  
  try {
    // 检查商品
    console.log('1. 检查商品 API...');
    const productsResult = await checkProducts();
    console.log(`   Status: ${productsResult.status}`);
    
    if (productsResult.status === 200) {
      const productCount = productsResult.data.data?.length || 0;
      const total = productsResult.data.pagination?.total || 0;
      console.log(`   ✅ API 正常，商品数量: ${total}`);
      
      if (total === 0) {
        console.log('\n⚠️  数据库中没有商品数据');
        console.log('2. 尝试运行 seed...');
        
        try {
          const seedResult = await runSeed();
          console.log(`   Status: ${seedResult.status}`);
          
          if (seedResult.status === 200 && seedResult.data.success) {
            console.log('   ✅ Seed 执行成功');
            console.log(`   商品数量: ${seedResult.data.results.productCountAfter}`);
            console.log(`   变体数量: ${seedResult.data.results.variantCount}`);
            
            if (seedResult.data.results.sampleProducts?.length > 0) {
              console.log('\n   示例商品:');
              seedResult.data.results.sampleProducts.forEach((p, i) => {
                console.log(`     ${i + 1}. ${p.name} (${p.slug})`);
              });
            }
          } else {
            console.log('   ❌ Seed 执行失败:', seedResult.data.error || seedResult.data.message);
          }
        } catch (seedError) {
          console.log('   ❌ Seed 端点不可用:', seedError.message);
          console.log('   💡 建议: 需要先部署包含 seed 端点的代码到 GCP');
        }
      } else {
        console.log('\n✅ 数据库中已有商品数据，可以继续测试');
        if (productsResult.data.data?.length > 0) {
          console.log('\n   示例商品:');
          productsResult.data.data.slice(0, 5).forEach((p, i) => {
            console.log(`     ${i + 1}. ${p.name} (${p.slug})`);
          });
        }
      }
    } else {
      console.log(`   ❌ API 返回错误: ${productsResult.data.error || productsResult.data.message}`);
    }
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    process.exit(1);
  }
}

main();

