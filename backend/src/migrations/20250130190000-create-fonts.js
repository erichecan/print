/**
 * Create fonts table
 * [2025-01-30 19:00:00] 创建字体表
 */
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fonts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      display_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      preview_text: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'Aa'
      },
      category: {
        type: Sequelize.ENUM('latin', 'chinese', 'japanese', 'hindi', 'arabic', 'korean', 'thai'),
        allowNull: false,
        defaultValue: 'latin'
      },
      source: {
        type: Sequelize.ENUM('system', 'google', 'custom'),
        allowNull: false,
        defaultValue: 'system'
      },
      google_font_family: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      weights: {
        type: Sequelize.JSON,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      sort_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        // [2025-01-30 19:45:00] 暂时不添加外键约束，避免类型不匹配问题
        // references: { model: 'users', key: 'id' },
        // onDelete: 'SET NULL',
        comment: '创建者用户 ID'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 创建索引
    await queryInterface.addIndex('fonts', ['name'], { unique: true, name: 'idx_fonts_name' });
    await queryInterface.addIndex('fonts', ['category'], { name: 'idx_fonts_category' });
    await queryInterface.addIndex('fonts', ['is_active'], { name: 'idx_fonts_is_active' });
    await queryInterface.addIndex('fonts', ['sort_order'], { name: 'idx_fonts_sort_order' });
    await queryInterface.addIndex('fonts', ['source'], { name: 'idx_fonts_source' });
    await queryInterface.addIndex('fonts', ['created_at'], { name: 'idx_fonts_created_at' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('fonts');
  }
};

