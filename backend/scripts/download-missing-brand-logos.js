/**
 * 下载缺失的品牌 logo
 * [2025-01-29 03:40:00] 从多个来源下载品牌 logo
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const OUTPUT_DIR = path.join(__dirname, '../../apps/web/public/assets/brands');

// [2025-01-29 03:40:00] 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// [2025-01-29 03:40:00] 下载图片
function downloadImage(imageUrl, outputPath) {
  return new Promise((resolve, reject) => {
    if (!imageUrl || !imageUrl.startsWith('http')) {
      return reject(new Error(`无效的图片 URL: ${imageUrl}`));
    }
    
    const urlObj = new URL(imageUrl);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const file = fs.createWriteStream(outputPath);
    
    const request = client.get(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    }, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(outputPath);
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        downloadImage(response.headers.location, outputPath).then(resolve).catch(reject);
      } else {
        file.close();
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    });
    
    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      reject(err);
    });
    
    request.setTimeout(10000, () => {
      request.destroy();
      file.close();
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      reject(new Error('超时'));
    });
  });
}

// [2025-01-29 03:40:00] 品牌 logo URL 列表（使用公开可用的资源）
const brandUrls = [
  {
    name: 'Gildan',
    slug: 'gildan',
    urls: [
      'https://www.gildan.com/content/dam/gildan/logo/gildan-logo.png',
      'https://logos-world.net/wp-content/uploads/2020/11/Gildan-Logo.png',
    ],
  },
  {
    name: 'Comfort Colors',
    slug: 'comfort-colors',
    urls: [
      'https://www.comfortcolors.com/wp-content/uploads/2020/06/comfort-colors-logo.png',
      'https://logos-world.net/wp-content/uploads/2021/02/Comfort-Colors-Logo.png',
    ],
  },
  {
    name: 'JBL',
    slug: 'jbl',
    urls: [
      'https://www.jbl.com/on/demandware.static/-/Sites-masterCatalog_Harman/default/dw12345678/images/jbl-logo.png',
      'https://logos-world.net/wp-content/uploads/2020/04/JBL-Logo.png',
    ],
  },
  {
    name: 'BIC',
    slug: 'bic',
    urls: [
      'https://www.bic.com/wp-content/uploads/2020/01/bic-logo.png',
      'https://logos-world.net/wp-content/uploads/2020/04/BIC-Logo.png',
    ],
  },
  {
    name: 'Herschel Supply Co.',
    slug: 'herschel',
    urls: [
      'https://www.herschel.com/on/demandware.static/-/Sites-herschel-master-catalog/default/dw12345678/images/herschel-logo.png',
      'https://logos-world.net/wp-content/uploads/2020/04/Herschel-Logo.png',
    ],
  },
  {
    name: 'Ogio',
    slug: 'ogio',
    urls: [
      'https://www.ogio.com/on/demandware.static/-/Sites-ogio-master-catalog/default/dw12345678/images/ogio-logo.png',
      'https://logos-world.net/wp-content/uploads/2020/11/Ogio-Logo.png',
    ],
  },
  {
    name: 'Peter Millar',
    slug: 'peter-millar',
    urls: [
      'https://www.petermillar.com/on/demandware.static/-/Sites-petermillar-master-catalog/default/dw12345678/images/peter-millar-logo.png',
    ],
  },
  {
    name: 'TravisMathew',
    slug: 'travismathew',
    urls: [
      'https://www.travismathew.com/on/demandware.static/-/Sites-travismathew-master-catalog/default/dw12345678/images/travis-mathew-logo.png',
    ],
  },
  {
    name: 'Moleskine',
    slug: 'moleskine',
    urls: [
      'https://www.moleskine.com/on/demandware.static/-/Sites-moleskine-master-catalog/default/dw12345678/images/moleskine-logo.png',
      'https://logos-world.net/wp-content/uploads/2020/04/Moleskine-Logo.png',
    ],
  },
  {
    name: 'Richardson',
    slug: 'richardson',
    urls: [
      'https://www.richardson.com/on/demandware.static/-/Sites-richardson-master-catalog/default/dw12345678/images/richardson-logo.png',
    ],
  },
  {
    name: 'Koozie',
    slug: 'koozie',
    urls: [
      'https://www.koozie.com/on/demandware.static/-/Sites-koozie-master-catalog/default/dw12345678/images/koozie-logo.png',
    ],
  },
];

async function downloadBrandLogos() {
  console.log('📥 开始下载缺失的品牌 logo...\n');
  
  const results = {
    success: [],
    failed: [],
    skipped: [],
  };
  
  for (const brand of brandUrls) {
    const filename = `${brand.slug}.png`;
    const outputPath = path.join(OUTPUT_DIR, filename);
    
    // 检查文件是否已存在且不为空
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      console.log(`  ⏭️  ${brand.name} - 已存在: ${filename}`);
      results.skipped.push(brand);
      continue;
    }
    
    let downloaded = false;
    for (const url of brand.urls) {
      try {
        console.log(`  📥 尝试下载 ${brand.name} 从: ${url.substring(0, 60)}...`);
        await downloadImage(url, outputPath);
        
        // 检查文件是否成功下载（大小 > 0）
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
          console.log(`  ✅ ${brand.name} - 已保存: ${filename}`);
          results.success.push(brand);
          downloaded = true;
          break;
        } else {
          // 文件为空，删除并尝试下一个 URL
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        }
      } catch (error) {
        // 尝试下一个 URL
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        continue;
      }
      
      // 添加延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    if (!downloaded) {
      console.log(`  ❌ ${brand.name} - 所有 URL 都失败`);
      results.failed.push(brand);
    }
  }
  
  console.log(`\n✨ 完成！`);
  console.log(`   - 成功: ${results.success.length} 个`);
  console.log(`   - 跳过: ${results.skipped.length} 个`);
  console.log(`   - 失败: ${results.failed.length} 个\n`);
  
  if (results.failed.length > 0) {
    console.log('⚠️  下载失败的品牌（需要手动处理）：\n');
    results.failed.forEach(brand => {
      console.log(`  - ${brand.name} (${brand.slug}.png)`);
    });
    console.log('\n💡 提示：可以手动从品牌官网下载 logo 并保存到 apps/web/public/assets/brands/ 目录\n');
  }
  
  return results;
}

if (require.main === module) {
  downloadBrandLogos()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 执行失败:', error);
      process.exit(1);
    });
}

module.exports = { downloadBrandLogos };

