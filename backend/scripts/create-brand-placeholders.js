/**
 * 为缺失的品牌创建文本占位符 SVG
* 为无法下载的品牌 logo 创建简单的文本占位符
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../../apps/web/public/assets/brands');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 创建文本占位符 SVG
function createPlaceholderSVG(brandName, filename) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="60" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="60" fill="#f5f5f5" stroke="#e5e7eb" stroke-width="1" rx="4"/>
  <text x="100" y="35" font-family="Arial, sans-serif" font-size="14" font-weight="600" 
        text-anchor="middle" fill="#6b7280">${brandName}</text>
</svg>`;
  
  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, svg);
  return outputPath;
}

// 需要创建占位符的品牌列表
const missingBrands = [
  { name: 'Comfort Colors', slug: 'comfort-colors' },
  { name: 'JBL', slug: 'jbl' },
  { name: 'BIC', slug: 'bic' },
  { name: 'Herschel Supply Co.', slug: 'herschel' },
  { name: 'Ogio', slug: 'ogio' },
  { name: 'Peter Millar', slug: 'peter-millar' },
  { name: 'TravisMathew', slug: 'travismathew' },
  { name: 'Moleskine', slug: 'moleskine' },
  { name: 'Koozie', slug: 'koozie' },
];

async function createPlaceholders() {
  console.log('🎨 为缺失的品牌创建占位符...\n');
  
  const created = [];
  const skipped = [];
  
  for (const brand of missingBrands) {
    const filename = `${brand.slug}.svg`;
    const outputPath = path.join(OUTPUT_DIR, filename);
    
    // 检查是否已有有效的 logo 文件
    const pngPath = path.join(OUTPUT_DIR, `${brand.slug}.png`);
    if (fs.existsSync(pngPath) && fs.statSync(pngPath).size > 0) {
      console.log(`  ⏭️  ${brand.name} - 已有 PNG 文件，跳过`);
      skipped.push(brand);
      continue;
    }
    
    if (fs.existsSync(outputPath)) {
      console.log(`  ⏭️  ${brand.name} - 占位符已存在: ${filename}`);
      skipped.push(brand);
      continue;
    }
    
    try {
      createPlaceholderSVG(brand.name, filename);
      console.log(`  ✅ ${brand.name} - 已创建占位符: ${filename}`);
      created.push(brand);
    } catch (error) {
      console.log(`  ❌ ${brand.name} - 创建失败: ${error.message}`);
    }
  }
  
  console.log(`\n✨ 完成！`);
  console.log(`   - 创建: ${created.length} 个占位符`);
  console.log(`   - 跳过: ${skipped.length} 个\n`);
  
  if (created.length > 0) {
    console.log('💡 提示：占位符是临时的，建议后续手动替换为真实的品牌 logo\n');
  }
}

if (require.main === module) {
  createPlaceholders()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 执行失败:', error);
      process.exit(1);
    });
}

module.exports = { createPlaceholders };

