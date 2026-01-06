/**
 * 数据迁移脚本：填充初始尺码数据
 * 将硬编码的尺码（XS, S, M, L, XL, 2XL, 3XL, 4XL, 5XL, YS, YM, YL）插入数据库
 * 
 * 使用方法：
 * node backend/scripts/migrate-size-fees.js
 */

const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

// 初始尺码数据配置
const INITIAL_SIZES = [
  // Youth sizes
  { size: 'YS', sizeType: 'Youth', additionalFee: 0, displayOrder: 1 },
  { size: 'YM', sizeType: 'Youth', additionalFee: 0, displayOrder: 2 },
  { size: 'YL', sizeType: 'Youth', additionalFee: 0, displayOrder: 3 },
  
  // Adult standard sizes
  { size: 'XS', sizeType: 'Adult', additionalFee: 0, displayOrder: 4 },
  { size: 'S', sizeType: 'Adult', additionalFee: 0, displayOrder: 5 },
  { size: 'M', sizeType: 'Adult', additionalFee: 0, displayOrder: 6 },
  { size: 'L', sizeType: 'Adult', additionalFee: 0, displayOrder: 7 },
  { size: 'XL', sizeType: 'Adult', additionalFee: 0, displayOrder: 8 },
  
  // Adult large sizes (with default fees)
  { size: '2XL', sizeType: 'Adult', additionalFee: 2.50, displayOrder: 9 },
  { size: '3XL', sizeType: 'Adult', additionalFee: 3.50, displayOrder: 10 },
  { size: '4XL', sizeType: 'Adult', additionalFee: 4.50, displayOrder: 11 },
  { size: '5XL', sizeType: 'Adult', additionalFee: 5.50, displayOrder: 12 },
];

async function migrateSizeFees() {
  try {
    console.log('开始迁移尺码数据...');
    
    // 检查现有数据
    const existingSizes = await prisma.offline_order_size_fees.findMany({
      select: { size: true },
    });
    const existingSizeNames = new Set(existingSizes.map(s => s.size));
    
    console.log(`现有尺码数量: ${existingSizeNames.size}`);
    
    // 使用事务批量插入或更新
    const results = await prisma.$transaction(
      INITIAL_SIZES.map(sizeConfig => {
        const isNew = !existingSizeNames.has(sizeConfig.size);
        
        return prisma.offline_order_size_fees.upsert({
          where: { size: sizeConfig.size },
          update: {
            // 如果已存在，只更新缺失的字段（保留现有费用配置）
            size_type: sizeConfig.sizeType,
            display_order: sizeConfig.displayOrder,
            is_active: true,
            updated_at: new Date(),
            // 如果 existing 的费用为0或null，使用默认值
            additional_fee: sizeConfig.additionalFee,
          },
          create: {
            id: uuidv4(),
            size: sizeConfig.size,
            size_type: sizeConfig.sizeType,
            additional_fee: sizeConfig.additionalFee,
            display_order: sizeConfig.displayOrder,
            is_active: true,
            updated_at: new Date(),
          },
        });
      })
    );
    
    console.log(`✅ 成功迁移 ${results.length} 个尺码配置`);
    
    // 验证迁移结果
    const allSizes = await prisma.offline_order_size_fees.findMany({
      orderBy: [{ display_order: 'asc' }, { size: 'asc' }],
    });
    
    console.log('\n尺码配置列表：');
    allSizes.forEach(sf => {
      console.log(`  - ${sf.size} (${sf.size_type || 'Adult'}): $${Number(sf.additional_fee).toFixed(2)}, 顺序: ${sf.display_order}, 启用: ${sf.is_active}`);
    });
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行迁移
if (require.main === module) {
  migrateSizeFees()
    .then(() => {
      console.log('\n✅ 迁移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 迁移失败:', error);
      process.exit(1);
    });
}

module.exports = { migrateSizeFees };

