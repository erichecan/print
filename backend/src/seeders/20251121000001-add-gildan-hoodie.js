const { v4: uuidv4 } = require('uuid');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Check if product already exists
        const existing = await queryInterface.sequelize.query(
            "SELECT id FROM products WHERE slug = 'gildan-heavy-blend-hoodie';",
            { type: Sequelize.QueryTypes.SELECT }
        );

        if (existing && existing.length > 0) {
            console.log('Product gildan-heavy-blend-hoodie already exists.');
            return;
        }

        const [categories, brands] = await Promise.all([
            queryInterface.sequelize.query('SELECT id, slug FROM categories WHERE is_active = true ORDER BY sort_order ASC LIMIT 3;', { type: Sequelize.QueryTypes.SELECT }),
            queryInterface.sequelize.query('SELECT id, slug FROM brands WHERE is_active = true ORDER BY name ASC LIMIT 3;', { type: Sequelize.QueryTypes.SELECT }),
        ]);

        const pick = (arr, i) => (arr && arr[i % arr.length])?.id || null;
        const now = new Date();

        const newProduct = {
            id: uuidv4(),
            name: 'Gildan Heavy Blend Hoodie',
            slug: 'gildan-heavy-blend-hoodie',
            description: 'Classic fit, comfortable hoodie.',
            long_description: 'A comfortable, heavy blend hoodie perfect for cold days.',
            base_price_cents: 3500,
            unit_cost: 16.0,
            sale_price: 0,
            gross_profit: 19.0,
            is_customizable: true,
            sku: 'hoodie-0002',
            stock_quantity: 100,
            weight: 0.7,
            dimensions: '—',
            is_active: true,
            category_id: pick(categories, 1), // Assuming index 1 is hoodies/sweatshirts
            brand_id: pick(brands, 0), // Assuming index 0 is Gildan
            created_at: now,
            updated_at: now,
        };

        await queryInterface.bulkInsert('products', [newProduct], {});

        // Add image
        await queryInterface.bulkInsert('product_images', [{
            id: uuidv4(),
            product_id: newProduct.id,
            url: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=1200&q=80',
            alt: 'Gildan Heavy Blend Hoodie',
            sort_order: 1,
            created_at: now
        }], {});
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('products', { slug: 'gildan-heavy-blend-hoodie' }, {});
    }
};
