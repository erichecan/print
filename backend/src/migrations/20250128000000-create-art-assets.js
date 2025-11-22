// [2025-01-28 00:40:00] Create art_assets table for Design Lab CMS
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // [2025-01-28 01:30:00] 确保 UUID 扩展存在
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', { transaction });
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";', { transaction });

      await queryInterface.createTable('art_assets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: '素材分类，如 Emojis, Shapes, Animals 等'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: '素材名称'
      },
      image_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: '素材图片 URL'
      },
      thumbnail_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: '缩略图 URL（可选）'
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '文件大小（字节）'
      },
      width: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '图片宽度（像素）'
      },
      height: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '图片高度（像素）'
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'MIME 类型，如 image/png, image/jpeg'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: '是否启用'
      },
      sort_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: '排序顺序'
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        // [2025-01-28 01:45:00] 暂时不添加外键约束，避免类型不匹配问题
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
    }, { transaction });

    // 创建索引
    await queryInterface.addIndex('art_assets', ['category'], {
      name: 'idx_art_assets_category',
      transaction
    });
    await queryInterface.addIndex('art_assets', ['is_active'], {
      name: 'idx_art_assets_is_active',
      transaction
    });
    await queryInterface.addIndex('art_assets', ['sort_order'], {
      name: 'idx_art_assets_sort_order',
      transaction
    });
    await queryInterface.addIndex('art_assets', ['created_at'], {
      name: 'idx_art_assets_created_at',
      transaction
    });

    await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeIndex('art_assets', 'idx_art_assets_created_at', { transaction });
      await queryInterface.removeIndex('art_assets', 'idx_art_assets_sort_order', { transaction });
      await queryInterface.removeIndex('art_assets', 'idx_art_assets_is_active', { transaction });
      await queryInterface.removeIndex('art_assets', 'idx_art_assets_category', { transaction });
      await queryInterface.dropTable('art_assets', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

