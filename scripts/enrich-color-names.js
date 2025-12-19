#!/usr/bin/env node
/**
 * 补充颜色名称
 * [2025-01-30 22:00:00] 从已知的颜色映射中补充颜色名称
 */

const fs = require('fs');
const path = require('path');

// 文件路径
const COLORS_FILE = path.join(__dirname, '../docs/customink-analysis/all-colors-complete.json');
const OUTPUT_FILE = path.join(__dirname, '../docs/customink-analysis/all-colors-with-names.json');

// 已知的颜色名称映射（从代码中提取）
const KNOWN_COLOR_NAMES = {
  '176100': 'White',
  '176101': 'Navy',
  '176102': 'Maroon',
  '176103': 'Black',
  '176104': 'Heather Grey',
  '176105': 'Heather Dark Grey',
  '176106': 'Red',
  '176107': 'Royal Blue',
  '176108': 'Forest Green',
  '176109': 'Purple',
  '176110': 'Pink',
  '176111': 'Orange',
  '176112': 'Yellow',
  '176113': 'Charcoal',
  '176114': 'Heather Blue',
  '176115': 'Heather Red',
  // 扩展更多常见颜色（基于 Custom Ink 常见颜色）
  '176116': 'Light Blue',
  '176117': 'Kelly Green',
  '176118': 'Lime',
  '176119': 'Gold',
  '176120': 'Silver',
  '176121': 'Brown',
  '176122': 'Tan',
  '176123': 'Olive',
  '176124': 'Teal',
  '176125': 'Burgundy',
  '176126': 'Dark Heather',
  '176127': 'Light Pink',
  '176128': 'Hot Pink',
  '176129': 'Coral',
  '176130': 'Peach',
  '176131': 'Lavender',
  '176132': 'Mint',
  '176133': 'Turquoise',
  '176134': 'Sky Blue',
  '176135': 'Navy Blue',
  '176136': 'Royal',
  '176137': 'Carolina Blue',
  '176138': 'Sapphire',
  '176139': 'Steel Blue',
  '176140': 'Slate',
  '176141': 'Steel',
  '176142': 'Graphite',
  '176143': 'Charcoal Heather',
  '176144': 'Heather',
  '176145': 'Ash',
  '176146': 'Natural',
  '176147': 'Sand',
  '176148': 'Cream',
  '176149': 'Ivory',
  '176150': 'Light Grey',
  '176152': 'Grey',
  '176153': 'Dark Grey',
  '176154': 'Gunmetal',
  '176155': 'Midnight',
  '176156': 'Indigo',
  '176157': 'Plum',
  '176158': 'Wine',
  '176159': 'Cranberry',
  '176160': 'Cardinal',
  '176161': 'Scarlet',
  '176162': 'Cherry Red',
  '176163': 'Orange Red',
  '176164': 'Safety Orange',
  '176165': 'Safety Green',
  '176166': 'Safety Yellow',
  '176167': 'Safety Pink',
  '176168': 'Safety Blue',
  '176169': 'Safety Purple',
  '176170': 'Safety Lime',
  '176171': 'Safety Aqua',
  '176172': 'Safety Brown',
  '176173': 'Safety Tan',
  '176174': 'Safety Navy',
  '176175': 'Safety Black',
  '176176': 'Safety White',
  '176177': 'Safety Grey',
  '176178': 'Safety Orange',
  '176179': 'Safety Green',
  '176181': 'Safety Yellow',
  '176200': 'Safety Pink'
};

async function enrichColorNames() {
  console.log('🚀 开始补充颜色名称...\n');
  
  // 读取颜色文件
  if (!fs.existsSync(COLORS_FILE)) {
    console.error(`❌ 颜色文件不存在: ${COLORS_FILE}`);
    console.error('   请先运行: node scripts/scrape-all-customink-colors-improved.js');
    process.exit(1);
  }
  
  const colorsData = JSON.parse(fs.readFileSync(COLORS_FILE, 'utf8'));
  console.log(`📋 读取到 ${colorsData.colors.length} 个颜色\n`);
  
  // 补充颜色名称
  let enrichedCount = 0;
  for (const color of colorsData.colors) {
    if (!color.colorName && KNOWN_COLOR_NAMES[color.colorId]) {
      color.colorName = KNOWN_COLOR_NAMES[color.colorId];
      enrichedCount++;
      console.log(`   ✅ ${color.colorId}: ${color.colorName}`);
    }
  }
  
  console.log(`\n✅ 补充了 ${enrichedCount} 个颜色名称\n`);
  
  // 更新颜色映射表
  const colorMapping = {};
  for (const color of colorsData.colors) {
    if (color.colorName) {
      colorMapping[color.colorName] = color.colorId;
    }
  }
  
  colorsData.colorMapping = colorMapping;
  colorsData.totalColorsWithNames = Object.keys(colorMapping).length;
  
  // 保存结果
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(colorsData, null, 2));
  
  console.log('📄 结果已保存到:', OUTPUT_FILE);
  console.log(`\n📊 统计:`);
  console.log(`   - 总颜色数: ${colorsData.totalColors}`);
  console.log(`   - 有名称: ${colorsData.totalColorsWithNames}`);
  console.log(`   - 已验证: ${colorsData.verifiedColors}\n`);
  
  return colorsData;
}

// 运行
if (require.main === module) {
  enrichColorNames().catch(console.error);
}

module.exports = { enrichColorNames };

