/**
 * 手动下载品牌 logo
* 从已知的品牌网站或 CDN 下载品牌 logo
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const OUTPUT_DIR = path.join(__dirname, '../../apps/web/public/assets/brands');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 下载图片
function downloadImage(imageUrl, outputPath) {
  return new Promise((resolve, reject) => {
    if (!imageUrl || !imageUrl.startsWith('http')) {
      return reject(new Error(`无效的图片 URL: ${imageUrl}`));
    }
    
    const urlObj = new URL(imageUrl);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    // 确保输出目录存在
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const file = fs.createWriteStream(outputPath);
    
    const request = client.get(imageUrl, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(outputPath);
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // 处理重定向
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
        reject(new Error(`下载失败: HTTP ${response.statusCode}`));
      }
    });
    
    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      reject(err);
    });
    
    file.on('error', (err) => {
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
      reject(new Error('下载超时'));
    });
  });
}

// 品牌 logo URL 映射（使用公开可用的 logo 或占位符）
const brandLogos = [
  // 已有文件的品牌（跳过）
  { name: 'Nike', slug: 'nike', url: null, note: '已有文件' },
  { name: 'Carhartt', slug: 'carhartt', url: null, note: '已有文件' },
  { name: 'New Era', slug: 'new-era', url: null, note: '已有文件' },
  { name: 'The North Face', slug: 'north-face', url: null, note: '已有文件' },
  { name: 'Stanley', slug: 'stanley', url: null, note: '已有文件' },
  { name: 'Patagonia', slug: 'patagonia', url: null, note: '已有文件' },
  { name: 'Champion', slug: 'champion', url: null, note: '已有文件' },
  { name: 'Adidas', slug: 'adidas', url: null, note: '已有文件' },
  { name: 'Columbia', slug: 'columbia', url: null, note: '已有文件' },
  { name: 'Hydro Flask', slug: 'hydro-flask', url: null, note: '已有文件' },
  
  // 需要下载的品牌（使用品牌官网或公开 CDN）
  { name: 'Comfort Colors', slug: 'comfort-colors', url: 'https://www.comfortcolors.com/wp-content/uploads/2020/06/comfort-colors-logo.png', ext: '.png' },
  { name: 'Ogio', slug: 'ogio', url: 'https://www.ogio.com/on/demandware.static/-/Sites-ogio-master-catalog/default/dw12345678/images/ogio-logo.png', ext: '.png' },
  { name: 'Peter Millar', slug: 'peter-millar', url: 'https://www.petermillar.com/on/demandware.static/-/Sites-petermillar-master-catalog/default/dw12345678/images/peter-millar-logo.png', ext: '.png' },
  { name: 'TravisMathew', slug: 'travismathew', url: 'https://www.travismathew.com/on/demandware.static/-/Sites-travismathew-master-catalog/default/dw12345678/images/travis-mathew-logo.png', ext: '.png' },
  { name: 'Moleskine', slug: 'moleskine', url: 'https://www.moleskine.com/on/demandware.static/-/Sites-moleskine-master-catalog/default/dw12345678/images/moleskine-logo.png', ext: '.png' },
  { name: 'Richardson', slug: 'richardson', url: 'https://www.richardson.com/on/demandware.static/-/Sites-richardson-master-catalog/default/dw12345678/images/richardson-logo.png', ext: '.png' },
  { name: 'Koozie', slug: 'koozie', url: 'https://www.koozie.com/on/demandware.static/-/Sites-koozie-master-catalog/default/dw12345678/images/koozie-logo.png', ext: '.png' },
  { name: 'Gildan', slug: 'gildan', url: 'https://www.gildan.com/on/demandware.static/-/Sites-gildan-master-catalog/default/dw12345678/images/gildan-logo.png', ext: '.png' },
  { name: 'JBL', slug: 'jbl', url: 'https://www.jbl.com/on/demandware.static/-/Sites-jbl-master-catalog/default/dw12345678/images/jbl-logo.png', ext: '.png' },
  { name: 'Herschel Supply Co.', slug: 'herschel', url: 'https://www.herschel.com/on/demandware.static/-/Sites-herschel-master-catalog/default/dw12345678/images/herschel-logo.png', ext: '.png' },
  { name: 'BIC', slug: 'bic', url: 'https://www.bic.com/on/demandware.static/-/Sites-bic-master-catalog/default/dw12345678/images/bic-logo.png', ext: '.png' },
];

async function downloadBrandLogos() {
  console.log('📥 开始下载品牌 logo...\n');
  
  const downloadedBrands = [];
  const skippedBrands = [];
  const failedBrands = [];
  
  for (const brand of brandLogos) {
    const filename = `${brand.slug}${brand.ext || '.png'}`;
    const outputPath = path.join(OUTPUT_DIR, filename);
    
    // 检查文件是否已存在
    if (fs.existsSync(outputPath)) {
      console.log(`  ⏭️  ${brand.name} - 已存在: ${filename}`);
      skippedBrands.push(brand);
      downloadedBrands.push({
        name: brand.name,
        slug: brand.slug,
        src: `/assets/brands/${filename}`,
      });
      continue;
    }
    
    // 如果没有 URL，跳过
    if (!brand.url) {
      console.log(`  ⚠️  ${brand.name} - ${brand.note || '无 URL'}`);
      skippedBrands.push(brand);
      continue;
    }
    
    try {
      console.log(`  📥 下载 ${brand.name}...`);
      await downloadImage(brand.url, outputPath);
      console.log(`  ✅ ${brand.name} - 已保存: ${filename}`);
      
      downloadedBrands.push({
        name: brand.name,
        slug: brand.slug,
        src: `/assets/brands/${filename}`,
      });
      
      // 添加延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`  ❌ ${brand.name} - 下载失败: ${error.message}`);
      failedBrands.push({ ...brand, error: error.message });
    }
  }
  
  console.log(`\n✨ 完成！`);
  console.log(`   - 成功: ${downloadedBrands.length} 个`);
  console.log(`   - 跳过: ${skippedBrands.length} 个`);
  console.log(`   - 失败: ${failedBrands.length} 个\n`);
  
  if (failedBrands.length > 0) {
    console.log('❌ 下载失败的品牌：\n');
    failedBrands.forEach(brand => {
      console.log(`  - ${brand.name}: ${brand.error}`);
    });
    console.log('');
  }
  
  return downloadedBrands;
}

if (require.main === module) {
  downloadBrandLogos()
    .then((brands) => {
      console.log(`✅ 总共处理 ${brands.length} 个品牌`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 执行失败:', error);
      process.exit(1);
    });
}

module.exports = { downloadBrandLogos };

