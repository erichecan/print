'use strict';

module.exports = {
  // [2025-11-10 10:30:00] Add cost management columns to products table
  async up(queryInterface, Sequelize) {
    // [2025-01-28 01:10:00] Guard against duplicate columns when migration re-runs (e.g. Render deploy rollback/retry)
    const tableDefinition = await queryInterface.describeTable('products');

    if (!tableDefinition.unit_cost) {
      await queryInterface.addColumn('products', 'unit_cost', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      });
    }

    if (!tableDefinition.sale_price) {
      await queryInterface.addColumn('products', 'sale_price', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      });
    }

    if (!tableDefinition.gross_profit) {
      await queryInterface.addColumn('products', 'gross_profit', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      });
    }
  },

  // [2025-11-10 10:30:00] Revert cost management columns
  async down(queryInterface) {
    await queryInterface.removeColumn('products', 'gross_profit');
    await queryInterface.removeColumn('products', 'sale_price');
    await queryInterface.removeColumn('products', 'unit_cost');
  }
};


