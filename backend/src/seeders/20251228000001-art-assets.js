const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Art Assets...');

    try {
        // 1. Clear existing data
        console.log('Cleaning up existing art assets...');
        await prisma.art_assets.deleteMany({});
        await prisma.artwork_categories.deleteMany({});

        // 2. Create Categories
        console.log('Creating categories...');

        // Shapes Category
        const shapesCategory = await prisma.artwork_categories.create({
            data: {
                id: uuidv4(),
                name: 'Shapes',
                slug: 'shapes',
                sort_order: 1,
                is_active: true,
            }
        });

        // Icons Category
        const iconsCategory = await prisma.artwork_categories.create({
            data: {
                id: uuidv4(),
                name: 'Icons',
                slug: 'icons',
                sort_order: 2,
                is_active: true,
            }
        });

        // 3. Create Art Assets
        console.log('Creating art assets...');

        const assets = [
            // Shapes
            {
                name: 'Circle',
                slug: 'shape-circle',
                category: 'Shapes', // Legacy field
                top_category_id: shapesCategory.id,
                image_url: 'https://placehold.co/400x400/transparent/000000.png?text=○',
                thumbnail_url: 'https://placehold.co/100x100/transparent/000000.png?text=○',
                sort_order: 1,
            },
            {
                name: 'Square',
                slug: 'shape-square',
                category: 'Shapes',
                top_category_id: shapesCategory.id,
                image_url: 'https://placehold.co/400x400/transparent/000000.png?text=□',
                thumbnail_url: 'https://placehold.co/100x100/transparent/000000.png?text=□',
                sort_order: 2,
            },
            {
                name: 'Triangle',
                slug: 'shape-triangle',
                category: 'Shapes',
                top_category_id: shapesCategory.id,
                image_url: 'https://placehold.co/400x400/transparent/000000.png?text=△',
                thumbnail_url: 'https://placehold.co/100x100/transparent/000000.png?text=△',
                sort_order: 3,
            },
            // Icons
            {
                name: 'Star',
                slug: 'icon-star',
                category: 'Icons',
                top_category_id: iconsCategory.id,
                image_url: 'https://placehold.co/400x400/transparent/000000.png?text=★',
                thumbnail_url: 'https://placehold.co/100x100/transparent/000000.png?text=★',
                sort_order: 1,
            },
            {
                name: 'Heart',
                slug: 'icon-heart',
                category: 'Icons',
                top_category_id: iconsCategory.id,
                image_url: 'https://placehold.co/400x400/transparent/000000.png?text=♥',
                thumbnail_url: 'https://placehold.co/100x100/transparent/000000.png?text=♥',
                sort_order: 2,
            },
        ];

        for (const asset of assets) {
            await prisma.art_assets.create({
                data: {
                    id: uuidv4(),
                    ...asset,
                    is_active: true,
                    width: 400,
                    height: 400,
                }
            });
        }

        console.log('✅ Art Assets seeding completed successfully.');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
