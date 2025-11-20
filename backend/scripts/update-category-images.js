// [2025-11-19] 更新数据库中分类的imageUrl字段
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 分类到图片的映射
const categoryImageMap = {
  't-shirts': '/assets/categories/cat-tshirt.png',
  'sweatshirts': '/assets/categories/cat-sweatshirt.png',
  'hoodies': '/assets/categories/cat-sweatshirt.png',
  'hats': '/assets/categories/cat-hat.png',
  'caps': '/assets/categories/cat-hat.png',
  'bags': '/assets/categories/cat-bag.png',
  'drinkware': '/assets/categories/cat-drinkware.png',
  'mugs': '/assets/categories/cat-drinkware.png',
  'tech': '/assets/categories/cat-tech.png',
  'tech-accessories': '/assets/categories/cat-tech.png',
  'office': '/assets/categories/cat-office.png',
  'office-supplies': '/assets/categories/cat-office.png',
  'activewear': '/assets/categories/cat-activewear.png',
  'jackets': '/assets/categories/cat-jacket-vest.png',
  'jacket-vest': '/assets/categories/cat-jacket-vest.png',
  'vests': '/assets/categories/cat-jacket-vest.png',
  'polo': '/assets/categories/cat-polo-business.png',
  'polo-business': '/assets/categories/cat-polo-business.png',
  'business': '/assets/categories/cat-polo-business.png',
  'trade-show': '/assets/categories/cat-trade-show.png',
  'tradeshow': '/assets/categories/cat-trade-show.png',
  'workwear': '/assets/categories/cat-workwear.png',
  'uniforms': '/assets/categories/cat-workwear.png'
};

async function updateCategoryImages() {
  try {
    console.log('🔄 开始更新分类图片路径...');
    
    // 获取所有分类
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        parentId: null, // 只更新一级分类
      }
    });

    console.log(`📊 找到 ${categories.length} 个分类`);

    for (const category of categories) {
      let imageUrl = categoryImageMap[category.slug];
      
      // 如果没有直接匹配，尝试名称匹配
      if (!imageUrl) {
        const name = category.name.toLowerCase();
        for (const [key, path] of Object.entries(categoryImageMap)) {
          if (name.includes(key.replace('-', ' ')) || name.includes(key)) {
            imageUrl = path;
            break;
          }
        }
      }

      // 如果还是没有匹配，使用默认图片
      if (!imageUrl) {
        imageUrl = '/assets/categories/cat-tshirt.png';
      }

      // 更新数据库
      await prisma.category.update({
        where: { id: category.id },
        data: { imageUrl }
      });

      console.log(`✅ 更新分类 "${category.name}" (${category.slug}): ${imageUrl}`);
    }

    console.log('🎉 所有分类图片更新完成！');
    
  } catch (error) {
    console.error('❌ 更新分类图片时出错:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  updateCategoryImages();
}

module.exports = { updateCategoryImages, categoryImageMap };