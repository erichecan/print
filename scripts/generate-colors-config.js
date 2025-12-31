#!/usr/bin/env node
/**
 * 生成颜色配置
* 从 all-colors-with-names.json 生成上传脚本的配置
 */

const fs = require('fs');
const path = require('path');

const COLORS_FILE = path.join(__dirname, '../docs/customink-analysis/all-colors-with-names.json');
const OUTPUT_FILE = path.join(__dirname, '../scripts/colors-config-generated.js');

const colorsData = JSON.parse(fs.readFileSync(COLORS_FILE, 'utf8'));

// 生成颜色映射对象
const colorsConfig = {};
for (const color of colorsData.colors) {
  if (color.colorName) {
    colorsConfig[color.colorName] = color.colorId;
  } else {
    // 如果没有名称，使用 Color-{ID}
    colorsConfig[`Color-${color.colorId}`] = color.colorId;
  }
}

// 生成配置代码
const configCode = `// 自动生成的颜色配置
// 从 docs/customink-analysis/all-colors-with-names.json 生成
// 共 ${Object.keys(colorsConfig).length} 个颜色

module.exports = ${JSON.stringify(colorsConfig, null, 2)};
`;

fs.writeFileSync(OUTPUT_FILE, configCode);

console.log(`✅ 已生成颜色配置: ${OUTPUT_FILE}`);
console.log(`   颜色数量: ${Object.keys(colorsConfig).length}`);

