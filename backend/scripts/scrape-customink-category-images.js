/**
 * 爬取 Custom Ink 分类图片
 * [2025-01-29 23:40:00] 从 Custom Ink 首页爬取所有分类的图片
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const HOMEPAGE_URL = 'https://www.customink.com';
const OUTPUT_DIR = path.join(__dirname, '../../apps/web/public/assets/categories');

// [2025-01-29 23:40:00] 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// [2025-01-29 23:40:00] 下载图片
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

// [2025-01-29 23:40:00] 分类名称到文件名的映射
const categoryMapping = {
  'T-shirts': 'cat-tshirt.png',
  'Hoodies & Sweatshirts': 'cat-sweatshirt.png',
  'Hats': 'cat-hat.png',
  'Jackets & Vests': 'cat-jacket-vest.png',
  'Bags': 'cat-bag.png',
  'Drinkware': 'cat-drinkware.png',
  'Polos & Business Wear': 'cat-polo-business.png',
  'Workwear and Uniforms': 'cat-workwear.png',
  'Office Supplies': 'cat-office.png',
  'Technology': 'cat-tech.png',
  'Trade Show & Signage': 'cat-trade-show.png',
  'Athleticwear': 'cat-activewear.png',
};

async function scrapeCategoryImages() {
  console.log('🕷️  开始爬取 Custom Ink 分类图片...\n');
  console.log(`目标 URL: ${HOMEPAGE_URL}\n`);
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('📡 正在加载首页...');
    await page.goto(HOMEPAGE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // 等待页面完全加载
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🔍 正在提取分类信息...\n');
    
    // [2025-01-29 23:40:00] 提取分类卡片和图片
    const categories = await page.evaluate(() => {
      // 查找所有可能的分类卡片
      const categoryCards = Array.from(document.querySelectorAll('[class*="category"], [class*="Category"], a[href*="/products"], a[href*="/categories"]'));
      
      const foundCategories = [];
      const seenImages = new Set();
      
      categoryCards.forEach((card) => {
        // 查找卡片内的图片
        const img = card.querySelector('img');
        if (!img) return;
        
        const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
        if (!src || !src.startsWith('http') || seenImages.has(src)) return;
        
        // 获取分类名称
        const nameElement = card.querySelector('h2, h3, [class*="title"], [class*="name"]') || card;
        const name = nameElement.textContent?.trim() || img.alt || '';
        
        // 过滤掉 logo 和无关图片
        if (src.includes('logo') || src.includes('icon') || src.includes('avatar')) return;
        if (name.toLowerCase().includes('brand') || name.toLowerCase().includes('logo')) return;
        
        // 检查图片尺寸（分类图片通常较大）
        const width = img.naturalWidth || img.width || 0;
        const height = img.naturalHeight || img.height || 0;
        if (width < 100 || height < 100) return;
        
        seenImages.add(src);
        
        foundCategories.push({
          name: name.substring(0, 100), // 限制长度
          imageUrl: src,
          width,
          height,
        });
      });
      
      return foundCategories;
    });
    
    console.log(`找到 ${categories.length} 个可能的分类\n`);
    
    // [2025-01-29 23:40:00] 显示找到的分类
    categories.slice(0, 20).forEach((cat, index) => {
      console.log(`  ${index + 1}. ${cat.name}`);
      console.log(`     图片: ${cat.imageUrl.substring(0, 80)}...`);
      console.log(`     尺寸: ${cat.width}x${cat.height}\n`);
    });
    
    // [2025-01-29 23:40:00] 根据分类名称匹配并下载
    console.log('📥 开始下载分类图片...\n');
    
    const downloaded = [];
    const failed = [];
    
    for (const categoryName of Object.keys(categoryMapping)) {
      const filename = categoryMapping[categoryName];
      const outputPath = path.join(OUTPUT_DIR, filename);
      
      // [2025-01-29 23:55:00] 强制重新下载（如果需要，可以添加 --force 参数）
      const forceDownload = process.argv.includes('--force');
      if (!forceDownload && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        console.log(`  ⏭️  ${categoryName} - 已存在: ${filename} (使用 --force 强制重新下载)`);
        downloaded.push({ name: categoryName, filename, status: 'exists' });
        continue;
      }
      
      // 在找到的分类中查找匹配的
      const matched = categories.find(cat => {
        const catNameLower = cat.name.toLowerCase();
        const searchNameLower = categoryName.toLowerCase();
        
        // 尝试匹配分类名称的关键词
        const keywords = searchNameLower.split(/[&\s]+/);
        return keywords.some(keyword => catNameLower.includes(keyword));
      });
      
      if (matched) {
        try {
          console.log(`  📥 下载 ${categoryName}...`);
          await downloadImage(matched.imageUrl, outputPath);
          
          if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
            console.log(`  ✅ ${categoryName} - 已保存: ${filename}`);
            downloaded.push({ name: categoryName, filename, status: 'downloaded' });
          } else {
            throw new Error('文件为空');
          }
          
          // 添加延迟避免请求过快
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.log(`  ❌ ${categoryName} - 下载失败: ${error.message}`);
          failed.push({ name: categoryName, filename, error: error.message });
        }
      } else {
        console.log(`  ⚠️  ${categoryName} - 未找到匹配的图片`);
        failed.push({ name: categoryName, filename, error: '未找到匹配' });
      }
    }
    
    console.log(`\n✨ 完成！`);
    console.log(`   - 成功: ${downloaded.length} 个`);
    console.log(`   - 失败: ${failed.length} 个\n`);
    
    if (failed.length > 0) {
      console.log('⚠️  下载失败的分类：\n');
      failed.forEach(item => {
        console.log(`  - ${item.name} (${item.filename}): ${item.error}`);
      });
      console.log('\n💡 提示：可以手动从 Custom Ink 网站下载分类图片\n');
    }
    
    return downloaded;
    
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
  scrapeCategoryImages()
    .then((categories) => {
      console.log(`✅ 总共处理 ${categories.length} 个分类`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 执行失败:', error);
      process.exit(1);
    });
}

module.exports = { scrapeCategoryImages };

