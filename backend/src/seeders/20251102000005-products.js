// [2025-11-16 15:55:00] Seed demo products with images so PLP/PDP/Cart can be verified end-to-end
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [categories, brands] = await Promise.all([
      queryInterface.sequelize.query('SELECT id, slug FROM categories WHERE is_active = true ORDER BY sort_order ASC LIMIT 3;', { type: Sequelize.QueryTypes.SELECT }),
      queryInterface.sequelize.query('SELECT id, slug FROM brands WHERE is_active = true ORDER BY name ASC LIMIT 3;', { type: Sequelize.QueryTypes.SELECT }),
    ]);

    const pick = (arr, i) => (arr && arr[i % arr.length])?.id || null;
    const now = new Date();

    const demoProducts = [
      {
        id: uuidv4(),
        name: 'Gildan Softstyle Jersey T‑shirt',
        slug: 'gildan-softstyle-jersey-tee',
        description: 'A customer favorite tee for screen print or DTG.',
        long_description: 'Soft ringspun cotton with modern fit. Perfect for events, teams and giveaways.',
        base_price: 15.0,
        unit_cost: 6.5,
        sale_price: 0,
        gross_profit: 8.5,
        is_customizable: true,
        sku: 'tee-0001',
        stock_quantity: 120,
        weight: 0.25,
        dimensions: '—',
        is_active: true,
        category_id: pick(categories, 0),
        brand_id: pick(brands, 0),
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        name: 'Midweight Fleece Hoodie',
        slug: 'midweight-fleece-hoodie',
        description: 'Cozy hoodie ideal for embroidery or screen printing.',
        long_description: 'Midweight 50/50 fleece. Great for teams, class trips and company swag.',
        base_price: 35.0,
        unit_cost: 16.0,
        sale_price: 0,
        gross_profit: 19.0,
        is_customizable: true,
        sku: 'hoodie-0001',
        stock_quantity: 80,
        weight: 0.7,
        dimensions: '—',
        is_active: true,
        category_id: pick(categories, 1),
        brand_id: pick(brands, 1),
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        name: 'Classic Trucker Hat',
        slug: 'classic-trucker-hat',
        description: 'Breathable mesh-back cap perfect for patches.',
        long_description: 'Snapback fit with foam front panel. Great canvas for brand patches.',
        base_price: 18.0,
        unit_cost: 7.0,
        sale_price: 0,
        gross_profit: 11.0,
        is_customizable: true,
        sku: 'hat-0001',
        stock_quantity: 150,
        weight: 0.2,
        dimensions: '—',
        is_active: true,
        category_id: pick(categories, 2),
        brand_id: pick(brands, 2),
        created_at: now,
        updated_at: now,
      },
    ];

    await queryInterface.bulkInsert('products', demoProducts, {});

    const images = [
      {
        id: uuidv4(),
        product_id: demoProducts[0].id,
        variant_id: null,
        image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=1200&q=80',
        alt_text: 'Gildan softstyle jersey tee',
        sort_order: 1,
        is_primary: true,
      },
      {
        id: uuidv4(),
        product_id: demoProducts[1].id,
        variant_id: null,
        image_url: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?w=1200&q=80',
        alt_text: 'Midweight fleece hoodie',
        sort_order: 1,
        is_primary: true,
      },
      {
        id: uuidv4(),
        product_id: demoProducts[2].id,
        variant_id: null,
        image_url: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=1200&q=80',
        alt_text: 'Classic trucker hat',
        sort_order: 1,
        is_primary: true,
      },
    ];

    await queryInterface.bulkInsert('product_images', images, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('product_images', null, {});
    await queryInterface.bulkDelete('products', null, {});
  },
};


