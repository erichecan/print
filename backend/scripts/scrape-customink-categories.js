/**
 * 爬取 Custom Ink 分类信息并导入数据库
 * [2025-01-30 11:00:00] 从 Custom Ink 产品页面抓取所有分类信息
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PRODUCTS_URL = 'https://www.customink.com/products';

// [2025-01-30 11:00:00] 从名称生成 slug
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// [2025-01-30 11:00:00] 确保分类存在，如果不存在则创建
async function ensureCategory(categoryData, parentId = null) {
  const { name, slug, description, imageUrl, sortOrder = 0 } = categoryData;
  
  try {
    // 检查分类是否已存在
    const existing = await prisma.category.findUnique({
      where: { slug },
    });

    if (existing) {
      // 更新现有分类
      const updated = await prisma.category.update({
        where: { slug },
        data: {
          name,
          description: description || existing.description,
          imageUrl: imageUrl || existing.imageUrl,
          parentId: parentId || existing.parentId,
          sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
        },
      });
      console.log(`  ✅ 更新分类: ${name} (${slug})`);
      return updated;
    } else {
      // 创建新分类
      const created = await prisma.category.create({
        data: {
          name,
          slug,
          description: description || null,
          imageUrl: imageUrl || null,
          parentId: parentId || null,
          sortOrder,
          isActive: true,
        },
      });
      console.log(`  ✅ 创建分类: ${name} (${slug})`);
      return created;
    }
  } catch (error) {
    console.error(`  ❌ 处理分类失败 ${name}:`, error.message);
    throw error;
  }
}

// [2025-01-30 11:00:00] 爬取分类信息
async function scrapeCategories() {
  console.log('🕷️  开始爬取 Custom Ink 分类信息...\n');
  console.log(`目标 URL: ${PRODUCTS_URL}\n`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('📡 正在加载页面...');
    await page.goto(PRODUCTS_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // 等待页面完全加载
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🔍 正在提取分类信息...\n');

    // [2025-01-30 11:00:00] 提取所有分类信息
    const categoriesData = await page.evaluate(() => {
      const categories = [];
      const seenSlugs = new Set();

      // 查找所有分类链接和标题
      // 主要分类通常在 "Shop By" 部分
      const shopBySection = document.querySelector('[class*="shop"], [id*="shop"], section, nav');
      
      // 查找所有可能的分类元素
      const categorySelectors = [
        'a[href*="/products/"]',
        'a[href*="/categories/"]',
        '[class*="category"]',
        '[class*="Category"]',
        'h2, h3, h4',
        'li a',
      ];

      // 提取主分类（一级分类）
      const mainCategories = [];
      const categoryLinks = Array.from(document.querySelectorAll('a[href*="/products/"]'));
      
      categoryLinks.forEach((link) => {
        const href = link.getAttribute('href');
        const text = link.textContent?.trim() || '';
        
        if (!href || !text || text.length < 2 || text.length > 100) return;
        
        // 解析 URL 路径
        const urlPath = new URL(href, window.location.origin).pathname;
        const pathParts = urlPath.split('/').filter(p => p && p !== 'products');
        
        if (pathParts.length === 0) return;
        
        const mainCategory = pathParts[0];
        const subCategory = pathParts[1];
        
        // 提取主分类
        if (mainCategory && !seenSlugs.has(mainCategory)) {
          seenSlugs.add(mainCategory);
          mainCategories.push({
            name: text.split(' ')[0] || mainCategory.replace(/-/g, ' '),
            slug: mainCategory,
            level: 1,
          });
        }
      });

      // 从页面文本中提取分类名称
      // 查找 "Shop By" 或类似标题下的分类列表
      const headings = Array.from(document.querySelectorAll('h2, h3, h4'));
      headings.forEach((heading) => {
        const text = heading.textContent?.trim() || '';
        if (text.length < 2 || text.length > 100) return;
        
        // 检查是否是分类标题
        if (
          text.includes('T-shirts') ||
          text.includes('Sweatshirts') ||
          text.includes('Hats') ||
          text.includes('Jackets') ||
          text.includes('Drinkware') ||
          text.includes('Bags') ||
          text.includes('Gifts') ||
          text.includes('Promotional') ||
          text.includes('Activewear') ||
          text.includes('Polo') ||
          text.includes('Workwear') ||
          text.includes('Business') ||
          text.includes('Women') ||
          text.includes('Office') ||
          text.includes('Technology') ||
          text.includes('Outdoor') ||
          text.includes('Accessories') ||
          text.includes('Health') ||
          text.includes('Pants') ||
          text.includes('Footwear')
        ) {
          // 在浏览器环境中生成 slug
          const slug = text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          if (!seenSlugs.has(slug)) {
            seenSlugs.add(slug);
            mainCategories.push({
              name: text,
              slug: slug,
              level: 1,
            });
          }
        }
      });

      return mainCategories;
    });

    // [2025-01-30 11:00:00] 手动定义主要分类（基于网页搜索结果）
    const mainCategories = [
      { name: 'T-shirts', slug: 't-shirts', sortOrder: 1 },
      { name: 'Sweatshirts', slug: 'sweatshirts', sortOrder: 2 },
      { name: 'Hats', slug: 'hats', sortOrder: 3 },
      { name: 'Jackets', slug: 'jackets', sortOrder: 4 },
      { name: 'Drinkware', slug: 'drinkware', sortOrder: 5 },
      { name: 'Bags', slug: 'bags', sortOrder: 6 },
      { name: 'Gifts', slug: 'gifts', sortOrder: 7 },
      { name: 'Promotional Products', slug: 'promotional-products', sortOrder: 8 },
      { name: 'Activewear', slug: 'activewear', sortOrder: 9 },
      { name: 'Polo Shirts', slug: 'polo-shirts', sortOrder: 10 },
      { name: 'Workwear & Uniforms', slug: 'workwear-uniforms', sortOrder: 11 },
      { name: 'Business Apparel', slug: 'business-apparel', sortOrder: 12 },
      { name: "Women's", slug: 'womens', sortOrder: 13 },
      { name: 'Office Supplies', slug: 'office-supplies', sortOrder: 14 },
      { name: 'Technology', slug: 'technology', sortOrder: 15 },
      { name: 'Outdoor & Leisure', slug: 'outdoor-leisure', sortOrder: 16 },
      { name: 'Accessories', slug: 'accessories', sortOrder: 17 },
      { name: 'Health & Personal Care', slug: 'health-personal-care', sortOrder: 18 },
      { name: 'Pants & Shorts', slug: 'pants-shorts', sortOrder: 19 },
      { name: 'Footwear', slug: 'footwear', sortOrder: 20 },
      { name: 'Kids', slug: 'kids', sortOrder: 21 },
      { name: 'New Arrivals', slug: 'new-arrivals', sortOrder: 22 },
      { name: 'No Minimum', slug: 'no-minimum', sortOrder: 23 },
      { name: 'Sustainable', slug: 'sustainable', sortOrder: 24 },
      { name: 'Made in USA', slug: 'made-in-usa', sortOrder: 25 },
    ];

    // [2025-01-30 11:00:00] 定义子分类（基于网页搜索结果）
    const subCategories = {
      't-shirts': [
        { name: 'Short Sleeve T-shirts', slug: 'short-sleeve-t-shirts', sortOrder: 1 },
        { name: 'Long Sleeve T-shirts', slug: 'long-sleeve-t-shirts', sortOrder: 2 },
        { name: 'Soft Tri-Blend T-shirts', slug: 'soft-tri-blend-t-shirts', sortOrder: 3 },
        { name: 'Performance Shirts', slug: 'performance-shirts', sortOrder: 4 },
        { name: "Women's T-shirts", slug: 'womens-t-shirts', sortOrder: 5 },
        { name: "Kids T-shirts", slug: 'kids-t-shirts', sortOrder: 6 },
        { name: 'Tie-Dye T-shirts', slug: 'tie-dye-t-shirts', sortOrder: 7 },
        { name: 'Tank Tops & Sleeveless', slug: 'tank-tops-sleeveless', sortOrder: 8 },
        { name: 'No Minimum T-shirts', slug: 'no-minimum-t-shirts', sortOrder: 9 },
        { name: 'Made in the USA T-shirts', slug: 'made-in-usa-t-shirts', sortOrder: 10 },
        { name: 'Tall T-shirts', slug: 'tall-t-shirts', sortOrder: 11 },
        { name: 'Canada T-shirts', slug: 'canada-t-shirts', sortOrder: 12 },
      ],
      'sweatshirts': [
        { name: 'Hoodies', slug: 'hoodies', sortOrder: 1 },
        { name: 'Crewneck Sweatshirts', slug: 'crewneck-sweatshirts', sortOrder: 2 },
        { name: 'Full Zip Sweatshirts', slug: 'full-zip-sweatshirts', sortOrder: 3 },
        { name: 'Quarter Zip Sweatshirts', slug: 'quarter-zip-sweatshirts', sortOrder: 4 },
        { name: 'Heavyweight Sweatshirts', slug: 'heavyweight-sweatshirts', sortOrder: 5 },
        { name: 'Lightweight Sweatshirts', slug: 'lightweight-sweatshirts', sortOrder: 6 },
        { name: 'Champion Sweatshirts', slug: 'champion-sweatshirts', sortOrder: 7 },
        { name: 'Carhartt Sweatshirts', slug: 'carhartt-sweatshirts', sortOrder: 8 },
        { name: 'Nike Sweatshirts', slug: 'nike-sweatshirts', sortOrder: 9 },
        { name: 'Performance Sweatshirts', slug: 'performance-sweatshirts', sortOrder: 10 },
        { name: 'Fleece Jackets & Pullovers', slug: 'fleece-jackets-pullovers', sortOrder: 11 },
        { name: 'Premium Sweatshirts', slug: 'premium-sweatshirts', sortOrder: 12 },
        { name: "Women's Hoodies & Sweatshirts", slug: 'womens-hoodies-sweatshirts', sortOrder: 13 },
        { name: 'Kids Sweatshirts', slug: 'kids-sweatshirts', sortOrder: 14 },
        { name: 'Tall Sweatshirts', slug: 'tall-sweatshirts', sortOrder: 15 },
        { name: 'Embroidered Sweatshirts', slug: 'embroidered-sweatshirts', sortOrder: 16 },
        { name: 'No Minimum Sweatshirts', slug: 'no-minimum-sweatshirts', sortOrder: 17 },
        { name: 'Canada Sweatshirts', slug: 'canada-sweatshirts', sortOrder: 18 },
      ],
      'hats': [
        { name: 'Beanies', slug: 'beanies', sortOrder: 1 },
        { name: 'Baseball Hats', slug: 'baseball-hats', sortOrder: 2 },
        { name: 'Trucker Hats', slug: 'trucker-hats', sortOrder: 3 },
        { name: 'No Minimum Hats', slug: 'no-minimum-hats', sortOrder: 4 },
        { name: 'Dad Hats', slug: 'dad-hats', sortOrder: 5 },
        { name: 'Patch Hats', slug: 'patch-hats', sortOrder: 6 },
        { name: 'Embroidered Hats', slug: 'embroidered-hats', sortOrder: 7 },
        { name: 'Premium Hats', slug: 'premium-hats', sortOrder: 8 },
        { name: 'Bucket Hats', slug: 'bucket-hats', sortOrder: 9 },
        { name: 'New Era Hats', slug: 'new-era-hats', sortOrder: 10 },
        { name: 'Nike Hats', slug: 'nike-hats', sortOrder: 11 },
        { name: 'Performance Hats', slug: 'performance-hats', sortOrder: 12 },
        { name: 'Work Hats', slug: 'work-hats', sortOrder: 13 },
        { name: 'Visors', slug: 'visors', sortOrder: 14 },
        { name: 'Camo Hats', slug: 'camo-hats', sortOrder: 15 },
        { name: 'Headbands', slug: 'headbands', sortOrder: 16 },
        { name: 'Kids Hats', slug: 'kids-hats', sortOrder: 17 },
        { name: 'Canada Hats', slug: 'canada-hats', sortOrder: 18 },
      ],
      'office-supplies': [
        { name: 'Notebooks', slug: 'notebooks', sortOrder: 1 },
        { name: 'Pens & Writing', slug: 'pens-writing', sortOrder: 2 },
        { name: 'Business Cards', slug: 'business-cards', sortOrder: 3 },
        { name: 'Sticky Notes', slug: 'sticky-notes', sortOrder: 4 },
        { name: 'Signs & Banners', slug: 'signs-banners', sortOrder: 5 },
        { name: 'Stickers', slug: 'stickers', sortOrder: 6 },
        { name: 'Sticker Roll', slug: 'sticker-roll', sortOrder: 7 },
        { name: 'Notepads', slug: 'notepads', sortOrder: 8 },
        { name: 'Calendars & Planners', slug: 'calendars-planners', sortOrder: 9 },
        { name: 'Desk Accessories', slug: 'desk-accessories', sortOrder: 10 },
        { name: 'Awards & Recognition', slug: 'awards-recognition', sortOrder: 11 },
        { name: 'Magnets', slug: 'magnets', sortOrder: 12 },
        { name: 'Memo Clips', slug: 'memo-clips', sortOrder: 13 },
        { name: 'Padfolios', slug: 'padfolios', sortOrder: 14 },
        { name: 'Folders', slug: 'folders', sortOrder: 15 },
        { name: 'Clipboards', slug: 'clipboards', sortOrder: 16 },
        { name: 'Packaging & Mailing Supplies', slug: 'packaging-mailing-supplies', sortOrder: 17 },
        { name: 'No Minimum Office Supplies', slug: 'no-minimum-office-supplies', sortOrder: 18 },
      ],
      'technology': [
        { name: 'Power Banks', slug: 'power-banks', sortOrder: 1 },
        { name: 'Wireless Chargers', slug: 'wireless-chargers', sortOrder: 2 },
        { name: 'Speakers', slug: 'speakers', sortOrder: 3 },
        { name: 'Headphones & Earbuds', slug: 'headphones-earbuds', sortOrder: 4 },
        { name: 'Charging Cables & Adapters', slug: 'charging-cables-adapters', sortOrder: 5 },
        { name: 'PopSocket®', slug: 'popsocket', sortOrder: 6 },
        { name: 'Phone Wallets', slug: 'phone-wallets', sortOrder: 7 },
        { name: 'Tech Accessories', slug: 'tech-accessories', sortOrder: 8 },
        { name: 'Mouse Pads', slug: 'mouse-pads', sortOrder: 9 },
        { name: 'Bluetooth & Wireless', slug: 'bluetooth-wireless', sortOrder: 10 },
        { name: 'Tech Organizers', slug: 'tech-organizers', sortOrder: 11 },
        { name: 'Laptop Sleeves & Cases', slug: 'laptop-sleeves-cases', sortOrder: 12 },
        { name: 'Tech Gifts', slug: 'tech-gifts', sortOrder: 13 },
        { name: 'Phone Holders & Mounts', slug: 'phone-holders-mounts', sortOrder: 14 },
        { name: 'USB Flash Drives', slug: 'usb-flash-drives', sortOrder: 15 },
        { name: 'No Minimum Technology', slug: 'no-minimum-technology', sortOrder: 16 },
        { name: 'Sustainable Technology', slug: 'sustainable-technology', sortOrder: 17 },
      ],
    };

    console.log('📥 开始导入分类到数据库...\n');

    // [2025-01-30 11:00:00] 导入主分类
    const parentCategoryMap = new Map();
    for (const mainCat of mainCategories) {
      const category = await ensureCategory(mainCat);
      parentCategoryMap.set(mainCat.slug, category.id);
    }

    console.log(`\n✅ 已导入 ${mainCategories.length} 个主分类\n`);

    // [2025-01-30 11:00:00] 导入子分类
    let subCategoryCount = 0;
    for (const [parentSlug, subCats] of Object.entries(subCategories)) {
      const parentId = parentCategoryMap.get(parentSlug);
      if (!parentId) {
        console.log(`  ⚠️  未找到父分类: ${parentSlug}`);
        continue;
      }

      for (const subCat of subCats) {
        await ensureCategory(subCat, parentId);
        subCategoryCount++;
      }
    }

    console.log(`\n✅ 已导入 ${subCategoryCount} 个子分类\n`);

    console.log('✨ 分类导入完成！');
    console.log(`   - 主分类: ${mainCategories.length} 个`);
    console.log(`   - 子分类: ${subCategoryCount} 个`);
    console.log(`   - 总计: ${mainCategories.length + subCategoryCount} 个分类\n`);

    return {
      mainCategories: mainCategories.length,
      subCategories: subCategoryCount,
      total: mainCategories.length + subCategoryCount,
    };

  } catch (error) {
    console.error('❌ 爬取失败:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  scrapeCategories()
    .then((result) => {
      console.log(`\n✅ 总共处理 ${result.total} 个分类`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 执行失败:', error);
      process.exit(1);
    });
}

module.exports = { scrapeCategories };

