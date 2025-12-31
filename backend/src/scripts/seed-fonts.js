/**
 * Seed Fonts - 初始化字体数据
* 将配置文件中的字体导入到数据库
 */
const { Font } = require('../models');
const logger = require('../utils/logger');

// 从配置文件读取字体数据（作为后备）
const defaultFonts = [
  // Latin Fonts
  { name: 'Arial', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 1 },
  { name: 'Helvetica', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 2 },
  { name: 'Times New Roman', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 3 },
  { name: 'Courier New', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 4 },
  { name: 'Georgia', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 5 },
  { name: 'Verdana', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 6 },
  { name: 'Comic Sans MS', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 7 },
  { name: 'Impact', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 8 },
  { name: 'Trebuchet MS', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 9 },
  { name: 'Palatino', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 10 },
  { name: 'Garamond', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 11 },
  { name: 'Bookman', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 12 },
  { name: 'Avant Garde', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 13 },
  { name: 'Arial Black', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 14 },
  { name: 'Tahoma', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 15 },
  { name: 'Roboto', previewText: 'Aa', category: 'latin', source: 'google', googleFontFamily: 'Roboto', weights: ['400', '500', '700'], sortOrder: 16 },
  { name: 'Open Sans', previewText: 'Aa', category: 'latin', source: 'google', googleFontFamily: 'Open Sans', weights: ['400', '600', '700'], sortOrder: 17 },
  { name: 'Lato', previewText: 'Aa', category: 'latin', source: 'google', googleFontFamily: 'Lato', weights: ['400', '700'], sortOrder: 18 },
  { name: 'Montserrat', previewText: 'Aa', category: 'latin', source: 'google', googleFontFamily: 'Montserrat', weights: ['400', '600', '700'], sortOrder: 19 },
  { name: 'Oswald', previewText: 'Aa', category: 'latin', source: 'google', googleFontFamily: 'Oswald', weights: ['400', '600', '700'], sortOrder: 20 },
  { name: 'Poppins', previewText: 'Aa', category: 'latin', source: 'google', googleFontFamily: 'Poppins', weights: ['400', '600', '700'], sortOrder: 21 },
  { name: 'Raleway', previewText: 'Aa', category: 'latin', source: 'google', googleFontFamily: 'Raleway', weights: ['400', '600', '700'], sortOrder: 22 },
  { name: 'Playfair Display', previewText: 'Aa', category: 'latin', source: 'google', googleFontFamily: 'Playfair Display', weights: ['400', '700'], sortOrder: 23 },
  { name: 'Merriweather', previewText: 'Aa', category: 'latin', source: 'google', googleFontFamily: 'Merriweather', weights: ['400', '700'], sortOrder: 24 },
  { name: 'Source Sans Pro', previewText: 'Aa', category: 'latin', source: 'google', googleFontFamily: 'Source Sans Pro', weights: ['400', '600', '700'], sortOrder: 25 },
  
  // Chinese Fonts (Simplified)
  { name: 'Noto Sans SC', previewText: '你好', category: 'chinese', source: 'google', googleFontFamily: 'Noto Sans SC', weights: ['400', '500', '600', '700'], sortOrder: 1 },
  { name: 'SimHei', previewText: '你好', category: 'chinese', source: 'system', sortOrder: 2 },
  { name: 'SimSun', previewText: '你好', category: 'chinese', source: 'system', sortOrder: 3 },
  { name: 'Microsoft YaHei', previewText: '你好', category: 'chinese', source: 'system', sortOrder: 4 },
  { name: 'KaiTi', previewText: '你好', category: 'chinese', source: 'system', sortOrder: 5 },
  { name: 'FangSong', previewText: '你好', category: 'chinese', source: 'system', sortOrder: 6 },
  
  // Chinese Fonts (Traditional)
  { name: 'Noto Sans TC', previewText: '你好', category: 'chinese', source: 'google', googleFontFamily: 'Noto Sans TC', weights: ['400', '500', '600', '700'], sortOrder: 7 },
  { name: 'Microsoft JhengHei', previewText: '你好', category: 'chinese', source: 'system', sortOrder: 8 },
  
  // Japanese Fonts
  { name: 'Noto Sans JP', previewText: 'こんにちは', category: 'japanese', source: 'google', googleFontFamily: 'Noto Sans JP', weights: ['400', '500', '600', '700'], sortOrder: 1 },
  { name: 'MS Gothic', previewText: 'こんにちは', category: 'japanese', source: 'system', sortOrder: 2 },
  { name: 'MS Mincho', previewText: 'こんにちは', category: 'japanese', source: 'system', sortOrder: 3 },
  { name: 'Yu Gothic', previewText: 'こんにちは', category: 'japanese', source: 'system', sortOrder: 4 },
  { name: 'Meiryo', previewText: 'こんにちは', category: 'japanese', source: 'system', sortOrder: 5 },
  
  // Hindi Fonts
  { name: 'Noto Sans Devanagari', previewText: 'नमस्ते', category: 'hindi', source: 'google', googleFontFamily: 'Noto Sans Devanagari', weights: ['400', '500', '600', '700'], sortOrder: 1 },
  { name: 'Mangal', previewText: 'नमस्ते', category: 'hindi', source: 'system', sortOrder: 2 },
  { name: 'Arial Unicode MS', previewText: 'नमस्ते', category: 'hindi', source: 'system', sortOrder: 3 },
];

async function seedFonts() {
  try {
    logger.info('[SeedFonts] Starting font seeding...');
    
    let created = 0;
    let skipped = 0;
    
    for (const fontData of defaultFonts) {
      try {
        const [font, wasCreated] = await Font.findOrCreate({
          where: { name: fontData.name },
          defaults: {
            ...fontData,
            is_active: true,
          }
        });
        
        if (wasCreated) {
          created++;
          logger.info(`[SeedFonts] Created font: ${fontData.name}`);
        } else {
          skipped++;
          logger.info(`[SeedFonts] Font already exists: ${fontData.name}`);
        }
      } catch (error) {
        logger.error(`[SeedFonts] Error seeding font ${fontData.name}:`, error);
      }
    }
    
    logger.info(`[SeedFonts] Font seeding completed. Created: ${created}, Skipped: ${skipped}`);
  } catch (error) {
    logger.error('[SeedFonts] Error seeding fonts:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const { sequelize } = require('../config/database');
  sequelize.authenticate()
    .then(() => {
      logger.info('[SeedFonts] Database connection established');
      return seedFonts();
    })
    .then(() => {
      logger.info('[SeedFonts] Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('[SeedFonts] Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedFonts };

