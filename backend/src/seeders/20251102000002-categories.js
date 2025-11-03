// [2025-11-02 21:00:00] Seed product categories
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const categories = [
      { id: uuidv4(), name: 'T-Shirts', slug: 't-shirts', description: 'Custom t-shirts and tees', is_active: true, sort_order: 1 },
      { id: uuidv4(), name: 'Sweatshirts', slug: 'sweatshirts', description: 'Hoodies and sweatshirts', is_active: true, sort_order: 2 },
      { id: uuidv4(), name: 'Hats', slug: 'hats', description: 'Caps and hats', is_active: true, sort_order: 3 },
      { id: uuidv4(), name: 'Jackets & Vests', slug: 'jackets-vests', description: 'Outerwear', is_active: true, sort_order: 4 },
      { id: uuidv4(), name: 'Bags', slug: 'bags', description: 'Tote bags and backpacks', is_active: true, sort_order: 5 },
      { id: uuidv4(), name: 'Drinkware', slug: 'drinkware', description: 'Mugs, water bottles, and tumblers', is_active: true, sort_order: 6 },
      { id: uuidv4(), name: 'Polos & Business', slug: 'polos-business', description: 'Business apparel', is_active: true, sort_order: 7 },
      { id: uuidv4(), name: 'Workwear', slug: 'workwear', description: 'Work uniforms and apparel', is_active: true, sort_order: 8 },
      { id: uuidv4(), name: 'Office Supplies', slug: 'office-supplies', description: 'Office items and supplies', is_active: true, sort_order: 9 },
      { id: uuidv4(), name: 'Technology', slug: 'technology', description: 'Tech accessories', is_active: true, sort_order: 10 }
    ];

    const now = new Date();
    const categoriesWithTimestamps = categories.map(cat => ({
      ...cat,
      created_at: now,
      updated_at: now
    }));

    await queryInterface.bulkInsert('categories', categoriesWithTimestamps, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('categories', null, {});
  }
};

