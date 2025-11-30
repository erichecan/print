/**
 * 爬取 Custom Ink 品牌合作区域的品牌 logo
 * [2025-01-29 03:15:00] 从 Custom Ink 网站爬取所有品牌 logo
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const BRANDS_URL = 'https://www.customink.com/brands';
const OUTPUT_DIR = path.join(__dirname, '../../apps/web/public/assets/brands');

// [2025-01-29 03:15:00] 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// [2025-01-29 03:15:00] 下载图片
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
        fs.unlinkSync(outputPath);
        downloadImage(response.headers.location, outputPath).then(resolve).catch(reject);
      } else {
        file.close();
        fs.unlinkSync(outputPath);
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
  });
}

// [2025-01-29 03:15:00] 从品牌名称生成文件名
function generateFilename(brandName) {
  return brandName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function scrapeBrandLogos() {
  console.log('🕷️  开始爬取 Custom Ink 品牌 logo...\n');
  console.log(`目标 URL: ${BRANDS_URL}\n`);
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('📡 正在加载页面...');
    await page.goto(BRANDS_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // [2025-01-29 03:20:00] 等待品牌 logo 加载
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔍 正在提取品牌信息...\n');
    
    // [2025-01-29 03:25:00] 提取所有图片信息用于调试
    console.log('🔍 正在分析页面结构...\n');
    
    const allImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images
        .map(img => ({
          src: img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('srcset')?.split(',')[0]?.trim().split(' ')[0],
          alt: img.alt || '',
          title: img.title || '',
          className: img.className || '',
          width: img.naturalWidth || img.width || 0,
          height: img.naturalHeight || img.height || 0,
          parentText: img.closest('a, div, li')?.textContent?.trim() || '',
        }))
        .filter(img => img.src && img.width > 30 && img.height > 20) // 过滤掉太小的图片
        .slice(0, 100); // 限制数量
    });
    
    console.log(`找到 ${allImages.length} 张图片\n`);
    
    // [2025-01-29 03:25:00] 显示所有图片信息供调试
    console.log('📋 图片列表（前20张）：\n');
    allImages.slice(0, 20).forEach((img, index) => {
      const shortSrc = img.src.length > 80 ? img.src.substring(0, 80) + '...' : img.src;
      console.log(`  ${index + 1}. ${img.alt || img.title || '无标题'}`);
      console.log(`     尺寸: ${img.width}x${img.height}`);
      console.log(`     URL: ${shortSrc}`);
      if (img.parentText) {
        console.log(`     附近文本: ${img.parentText.substring(0, 50)}...`);
      }
      console.log('');
    });
    
    // [2025-01-29 03:15:00] 根据图片描述中的品牌列表，手动定义品牌
    const knownBrands = [
      { name: 'Nike', slug: 'nike' },
      { name: 'Carhartt', slug: 'carhartt' },
      { name: 'New Era', slug: 'new-era' },
      { name: 'The North Face', slug: 'north-face' },
      { name: 'Stanley', slug: 'stanley' },
      { name: 'Patagonia', slug: 'patagonia' },
      { name: 'Champion', slug: 'champion' },
      { name: 'Comfort Colors', slug: 'comfort-colors' },
      { name: 'Ogio', slug: 'ogio' },
      { name: 'Peter Millar', slug: 'peter-millar' },
      { name: 'TravisMathew', slug: 'travismathew' },
      { name: 'Moleskine', slug: 'moleskine' },
      { name: 'Richardson', slug: 'richardson' },
      { name: 'Koozie', slug: 'koozie' },
      { name: 'Gildan', slug: 'gildan' },
      { name: 'Adidas', slug: 'adidas' },
      { name: 'JBL', slug: 'jbl' },
      { name: 'Herschel Supply Co.', slug: 'herschel' },
      { name: 'BIC', slug: 'bic' },
      { name: 'Hydro Flask', slug: 'hydro-flask' },
      { name: 'Columbia', slug: 'columbia' },
    ];
    
    console.log('📥 开始下载品牌 logo...\n');
    
    const downloadedBrands = [];
    
    // [2025-01-29 03:15:00] 尝试从页面中找到这些品牌的 logo
    for (const brand of knownBrands) {
      try {
        // [2025-01-29 03:25:00] 在页面中查找该品牌的 logo
        const brandNameLower = brand.name.toLowerCase();
        const brandSlugLower = brand.slug.toLowerCase();
        
        // 在 allImages 中查找匹配的图片
        const matchingImage = allImages.find(img => {
          const alt = (img.alt || '').toLowerCase();
          const title = (img.title || '').toLowerCase();
          const parentText = (img.parentText || '').toLowerCase();
          const src = (img.src || '').toLowerCase();
          
          return (
            alt.includes(brandNameLower) ||
            alt.includes(brandSlugLower) ||
            title.includes(brandNameLower) ||
            title.includes(brandSlugLower) ||
            parentText.includes(brandNameLower) ||
            parentText.includes(brandSlugLower) ||
            src.includes(brandSlugLower.replace(/-/g, '')) ||
            src.includes(brandNameLower.replace(/\s+/g, ''))
          );
        });
        
        const brandImage = matchingImage?.src;
        
        if (brandImage) {
          const ext = path.extname(new URL(brandImage).pathname) || '.png';
          const filename = `${brand.slug}${ext}`;
          const outputPath = path.join(OUTPUT_DIR, filename);
          
          // 如果文件已存在，跳过
          if (fs.existsSync(outputPath)) {
            console.log(`  ⏭️  ${brand.name} - 已存在: ${filename}`);
            downloadedBrands.push({
              name: brand.name,
              slug: brand.slug,
              src: `/assets/brands/${filename}`,
            });
            continue;
          }
          
          console.log(`  📥 下载 ${brand.name}...`);
          await downloadImage(brandImage, outputPath);
          console.log(`  ✅ ${brand.name} - 已保存: ${filename}`);
          
          downloadedBrands.push({
            name: brand.name,
            slug: brand.slug,
            src: `/assets/brands/${filename}`,
          });
          
          // 添加延迟避免请求过快
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.log(`  ⚠️  ${brand.name} - 未找到 logo`);
        }
      } catch (error) {
        console.log(`  ❌ ${brand.name} - 下载失败: ${error.message}`);
      }
    }
    
    console.log(`\n✨ 完成！成功下载 ${downloadedBrands.length} 个品牌 logo\n`);
    
    // [2025-01-29 03:15:00] 生成品牌列表 JSON 文件
    const brandsJson = {
      scrapedAt: new Date().toISOString(),
      source: BRANDS_URL,
      brands: downloadedBrands,
    };
    
    const jsonPath = path.join(OUTPUT_DIR, 'brands-list.json');
    fs.writeFileSync(jsonPath, JSON.stringify(brandsJson, null, 2));
    console.log(`📄 品牌列表已保存: ${jsonPath}\n`);
    
    return downloadedBrands;
    
  } catch (error) {
    console.error('❌ 爬取失败:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

if (require.main === module) {
  scrapeBrandLogos()
    .then((brands) => {
      console.log(`\n✅ 总共处理 ${brands.length} 个品牌`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 执行失败:', error);
      process.exit(1);
    });
}

module.exports = { scrapeBrandLogos };

