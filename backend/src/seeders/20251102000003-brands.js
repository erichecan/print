// Seed product brands
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const brands = [
      { id: uuidv4(), name: 'Gildan', slug: 'gildan', description: 'Quality blank apparel', is_active: true },
      { id: uuidv4(), name: 'Hanes', slug: 'hanes', description: 'Classic comfort', is_active: true },
      { id: uuidv4(), name: 'Jerzees', slug: 'jerzees', description: 'Reliable basics', is_active: true },
      { id: uuidv4(), name: 'Carhartt', slug: 'carhartt', description: 'Durable workwear', is_active: true },
      { id: uuidv4(), name: 'Nike', slug: 'nike', description: 'Athletic apparel', is_active: true },
      { id: uuidv4(), name: 'The North Face', slug: 'north-face', description: 'Outdoor gear', is_active: true },
      { id: uuidv4(), name: 'Patagonia', slug: 'patagonia', description: 'Sustainable outdoor wear', is_active: true },
      { id: uuidv4(), name: 'Stanley', slug: 'stanley', description: 'Premium drinkware', is_active: true }
    ];

    const now = new Date();
    const brandsWithTimestamps = brands.map(brand => ({
      ...brand,
      created_at: now,
      updated_at: now
    }));

    await queryInterface.bulkInsert('brands', brandsWithTimestamps, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('brands', null, {});
  }
};

