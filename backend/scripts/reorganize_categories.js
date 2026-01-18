const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Category Reorganization...');

    const categoryTree = [
        {
            name: 'T-shirts',
            slug: 't-shirts',
            subcategories: [
                { name: 'Long Sleeve T-shirts', slug: 'long-sleeve-t-shirts' },
                { name: 'Short Sleeve T-shirts', slug: 'short-sleeve-t-shirts' },
                { name: 'Soft Tri-Blend T-shirts', slug: 'soft-tri-blend-t-shirts' },
                { name: 'Performance Shirts', slug: 'performance-shirts' },
                { name: "Women's T-shirts", slug: 'womens-t-shirts' },
                { name: 'Kids T-shirts', slug: 'kids-t-shirts' },
                { name: 'Tie-Dye T-shirts', slug: 'tie-dye-t-shirts' },
                { name: 'Tank Tops & Sleeveless', slug: 'tank-tops-sleeveless' },
            ],
        },
        {
            name: 'Sweatshirts',
            slug: 'sweatshirts',
            subcategories: [
                { name: 'Hoodies', slug: 'hoodies' },
                { name: 'Crewneck Sweatshirts', slug: 'crewneck-sweatshirts' },
                { name: 'Full Zip Sweatshirts', slug: 'full-zip-sweatshirts' },
                { name: 'Quarter Zip Sweatshirts', slug: 'quarter-zip-sweatshirts' },
                { name: 'Heavyweight Sweatshirts', slug: 'heavyweight-sweatshirts' },
                { name: 'Lightweight Sweatshirts', slug: 'lightweight-sweatshirts' },
                { name: 'Champion Sweatshirts', slug: 'champion-sweatshirts' },
                { name: 'Carhartt Sweatshirts', slug: 'carhartt-sweatshirts' },
            ],
        },
        {
            name: 'Hats',
            slug: 'hats',
            subcategories: [
                { name: 'Baseball Hats', slug: 'baseball-hats' },
                { name: 'Beanies', slug: 'beanies' },
                { name: 'Trucker Hats', slug: 'trucker-hats' },
                { name: 'No Minimum Hats', slug: 'no-minimum-hats' },
                { name: 'Dad Hats', slug: 'dad-hats' },
                { name: 'Patch Hats', slug: 'patch-hats' },
            ],
        },
    ];

    const categoryMap = new Map(); // name -> id

    for (const parent of categoryTree) {
        console.log(`Creating parent category: ${parent.name}...`);
        const parentCat = await prisma.category.upsert({
            where: { slug: parent.slug },
            update: { name: parent.name },
            create: {
                name: parent.name,
                slug: parent.slug,
                isActive: true,
            },
        });
        categoryMap.set(parent.name, parentCat.id);

        for (const sub of parent.subcategories) {
            console.log(`  Creating subcategory: ${sub.name}...`);
            const subCat = await prisma.category.upsert({
                where: { slug: sub.slug },
                update: {
                    name: sub.name,
                    parentId: parentCat.id
                },
                create: {
                    name: sub.name,
                    slug: sub.slug,
                    parentId: parentCat.id,
                    isActive: true,
                },
            });
            categoryMap.set(sub.name, subCat.id);
        }
    }

    console.log('Classifying products...');
    const products = await prisma.product.findMany();
    console.log(`Found ${products.length} products to process.`);

    let updatedCount = 0;

    for (const product of products) {
        const name = product.name;
        const nameLower = name.toLowerCase();
        let targetCategoryName = null;

        // Mapping logic
        const isApparel = nameLower.includes('t-shirt') || nameLower.includes('tee') || nameLower.includes('tank') || nameLower.includes('sleeveless') || nameLower.includes('polo') || nameLower.includes('shirt') || nameLower.includes('bodysuit');

        if (isApparel && !(nameLower.includes('hoodie') || nameLower.includes('sweatshirt') || nameLower.includes('pullover'))) {
            // T-shirts sub-categorization
            if (nameLower.includes('performance') || nameLower.includes('polo') || nameLower.includes('competitor')) {
                targetCategoryName = 'Performance Shirts';
            } else if (nameLower.includes('youth') || nameLower.includes('kids') || nameLower.includes('baby') || nameLower.includes('toddler') || nameLower.includes('child') || nameLower.includes('infant') || nameLower.includes('bodysuit')) {
                targetCategoryName = 'Kids T-shirts';
            } else if (nameLower.includes('long sleeve')) {
                targetCategoryName = 'Long Sleeve T-shirts';
            } else if (nameLower.includes('tri-blend')) {
                targetCategoryName = 'Soft Tri-Blend T-shirts';
            } else if (nameLower.includes("women's")) {
                targetCategoryName = "Women's T-shirts";
            } else if (nameLower.includes('tie-dye')) {
                targetCategoryName = 'Tie-Dye T-shirts';
            } else if (nameLower.includes('tank') || nameLower.includes('sleeveless')) {
                targetCategoryName = 'Tank Tops & Sleeveless';
            } else {
                targetCategoryName = 'Short Sleeve T-shirts';
            }
        } else if (nameLower.includes('hoodie') || nameLower.includes('sweatshirt') || nameLower.includes('pullover')) {
            // Sweatshirts sub-categorization
            if (nameLower.includes('champion')) {
                targetCategoryName = 'Champion Sweatshirts';
            } else if (nameLower.includes('carhartt')) {
                targetCategoryName = 'Carhartt Sweatshirts';
            } else if (nameLower.includes('quarter zip')) {
                targetCategoryName = 'Quarter Zip Sweatshirts';
            } else if (nameLower.includes('zip')) {
                targetCategoryName = 'Full Zip Sweatshirts';
            } else if (nameLower.includes('heavyweight')) {
                targetCategoryName = 'Heavyweight Sweatshirts';
            } else if (nameLower.includes('lightweight')) {
                targetCategoryName = 'Lightweight Sweatshirts';
            } else if (nameLower.includes('crewneck')) {
                targetCategoryName = 'Crewneck Sweatshirts';
            } else {
                targetCategoryName = 'Hoodies';
            }
        } else if (nameLower.includes('hat') || nameLower.includes('beanie') || nameLower.includes('cap')) {
            // Hats sub-categorization
            if (nameLower.includes('beanie')) {
                targetCategoryName = 'Beanies';
            } else if (nameLower.includes('trucker')) {
                targetCategoryName = 'Trucker Hats';
            } else if (nameLower.includes('dad')) {
                targetCategoryName = 'Dad Hats';
            } else if (nameLower.includes('patch')) {
                targetCategoryName = 'Patch Hats';
            } else if (nameLower.includes('baseball') || nameLower.includes('cap')) {
                targetCategoryName = 'Baseball Hats';
            } else {
                targetCategoryName = 'No Minimum Hats';
            }
        }

        if (targetCategoryName && categoryMap.has(targetCategoryName)) {
            const categoryId = categoryMap.get(targetCategoryName);
            if (product.categoryId !== categoryId) {
                await prisma.product.update({
                    where: { id: product.id },
                    data: { categoryId },
                });
                updatedCount++;
            }
        }
    }

    console.log(`✅ Classification complete. Updated ${updatedCount} products.`);
    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
