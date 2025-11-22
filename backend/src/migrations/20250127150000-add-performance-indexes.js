/**
 * Migration: Add performance indexes for frequently queried fields
 * [2025-01-27 14:55:00]
 * [2025-01-11 14:10:00] 添加重复索引检查，防止迁移失败
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // [2025-01-11 14:10:00] 检查索引是否存在，避免重复创建导致迁移失败
      const checkIndex = async (tableName, indexName) => {
        const results = await queryInterface.sequelize.query(
          `SELECT indexname FROM pg_indexes WHERE tablename = $1 AND indexname = $2;`,
          {
            bind: [tableName, indexName],
            type: Sequelize.QueryTypes.SELECT,
            transaction
          }
        );
        return Array.isArray(results) && results.length > 0;
      };

      // [2025-01-28 01:35:00] 检查列是否存在
      const checkColumn = async (tableName, columnName) => {
        const results = await queryInterface.sequelize.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2;`,
          {
            bind: [tableName, columnName],
            type: Sequelize.QueryTypes.SELECT,
            transaction
          }
        );
        return Array.isArray(results) && results.length > 0;
      };

      // [2025-01-28 01:40:00] 检查表是否存在
      const checkTable = async (tableName) => {
        const results = await queryInterface.sequelize.query(
          `SELECT table_name FROM information_schema.tables WHERE table_name = $1;`,
          {
            bind: [tableName],
            type: Sequelize.QueryTypes.SELECT,
            transaction
          }
        );
        return Array.isArray(results) && results.length > 0;
      };

      // Ensure pg_trgm extension exists for trigram search
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;', { transaction });
      
      // Create trigram index with IF NOT EXISTS (native SQL)
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);',
        { transaction }
      );

      // Add other indexes with existence check
      if (!(await checkIndex('products', 'idx_products_created_at'))) {
        await queryInterface.addIndex('products', ['created_at'], {
          name: 'idx_products_created_at',
          transaction,
        });
      }

      // [2025-01-28 01:35:00] 只有在 base_price 列存在时才创建索引
      if (await checkColumn('products', 'base_price') && !(await checkIndex('products', 'idx_products_base_price'))) {
        await queryInterface.addIndex('products', ['base_price'], {
          name: 'idx_products_base_price',
          transaction,
        });
      }

      if (!(await checkIndex('orders', 'idx_orders_created_at'))) {
        await queryInterface.addIndex('orders', ['created_at'], {
          name: 'idx_orders_created_at',
          transaction,
        });
      }

      if (!(await checkIndex('orders', 'idx_orders_status'))) {
        await queryInterface.addIndex('orders', ['status'], {
          name: 'idx_orders_status',
          transaction,
        });
      }

      // [2025-01-28 01:40:00] 只有在表存在时才创建索引
      if (await checkTable('product_variants') && !(await checkIndex('product_variants', 'idx_product_variants_stock_quantity'))) {
        await queryInterface.addIndex('product_variants', ['stock_quantity'], {
          name: 'idx_product_variants_stock_quantity',
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('products', 'idx_products_created_at');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_products_name_trgm;');
    await queryInterface.removeIndex('products', 'idx_products_base_price');
    await queryInterface.removeIndex('orders', 'idx_orders_created_at');
    await queryInterface.removeIndex('orders', 'idx_orders_status');
    await queryInterface.removeIndex('product_variants', 'idx_product_variants_stock_quantity');
  },
};
