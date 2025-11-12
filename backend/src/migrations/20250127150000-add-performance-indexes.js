/**
 * Migration: Add performance indexes for frequently queried fields
 * [2025-01-27 14:55:00]
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('products', ['created_at'], {
      name: 'idx_products_created_at',
    });

    // Ensure pg_trgm extension exists for trigram search
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);'
    );

    await queryInterface.addIndex('products', ['base_price'], {
      name: 'idx_products_base_price',
    });

    await queryInterface.addIndex('orders', ['created_at'], {
      name: 'idx_orders_created_at',
    });

    await queryInterface.addIndex('orders', ['status'], {
      name: 'idx_orders_status',
    });

    await queryInterface.addIndex('product_variants', ['stock_quantity'], {
      name: 'idx_product_variants_stock_quantity',
    });
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
