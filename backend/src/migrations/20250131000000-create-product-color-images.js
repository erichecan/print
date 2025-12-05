// [2025-01-30 23:55:00] Create product_color_images table for Design Lab color-image mapping
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // [2025-01-30 23:55:00] 确保 UUID 扩展存在
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', { transaction });
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";', { transaction });

      await queryInterface.createTable('product_color_images', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        product_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'products', key: 'id' },
          onDelete: 'CASCADE'
        },
        customink_product_id: {
          type: Sequelize.STRING(100),
          allowNull: false,
          comment: 'Custom Ink 产品 ID（如 6a62c76ef0978853a20391b6c32da4fe）'
        },
        customink_color_id: {
          type: Sequelize.STRING(20),
          allowNull: false,
          comment: 'Custom Ink 颜色 ID（如 176100）'
        },
        color_name: {
          type: Sequelize.STRING(100),
          allowNull: false,
          comment: '颜色名称（如 White, Black）'
        },
        color_hex: {
          type: Sequelize.STRING(7),
          allowNull: true,
          comment: '颜色 hex 值（可选）'
        },
        image_urls: {
          type: Sequelize.JSONB,
          allowNull: false,
          comment: '图片 URL（front, back, sleeve）'
        },
        is_verified: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          comment: '是否已验证（图片 URL 是否存在）'
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          comment: '是否启用'
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
      }, { transaction });

      // 创建唯一索引
      await queryInterface.addIndex('product_color_images', {
        fields: ['customink_product_id', 'customink_color_id'],
        unique: true,
        name: 'product_color_images_customink_unique',
        transaction
      });

      // 创建其他索引
      await queryInterface.addIndex('product_color_images', {
        fields: ['customink_product_id'],
        name: 'product_color_images_product_id_idx',
        transaction
      });

      await queryInterface.addIndex('product_color_images', {
        fields: ['customink_color_id'],
        name: 'product_color_images_color_id_idx',
        transaction
      });

      await queryInterface.addIndex('product_color_images', {
        fields: ['color_name'],
        name: 'product_color_images_color_name_idx',
        transaction
      });

      await transaction.commit();
      console.log('[Migration] ✅ Created product_color_images table');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('product_color_images', { transaction });
      await transaction.commit();
      console.log('[Migration] ✅ Dropped product_color_images table');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

