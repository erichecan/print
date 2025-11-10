'use strict';

module.exports = {
  // [2025-11-10 10:30:00] Add cost management columns to products table
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'unit_cost', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn('products', 'sale_price', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn('products', 'gross_profit', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    });
  },

  // [2025-11-10 10:30:00] Revert cost management columns
  async down(queryInterface) {
    await queryInterface.removeColumn('products', 'gross_profit');
    await queryInterface.removeColumn('products', 'sale_price');
    await queryInterface.removeColumn('products', 'unit_cost');
  }
};


