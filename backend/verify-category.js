const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getCategoryIdsIncludingChildren(categorySlug) {
    const category = await prisma.category.findUnique({
        where: { slug: categorySlug },
        include: {
            children: {
                where: { isActive: true },
                include: {
                    children: {
                        where: { isActive: true },
                    },
                },
            },
        },
    });

    if (!category) {
        return [];
    }

    const categoryIds = [category.id];

    function collectChildIds(categories) {
        for (const child of categories) {
            categoryIds.push(child.id);
            if (child.children && child.children.length > 0) {
                collectChildIds(child.children);
            }
        }
    }

    if (category.children && category.children.length > 0) {
        collectChildIds(category.children);
    }

    return categoryIds;
}

async function main() {
    console.log("Checking products in category 'hats'...");
    const categoryIds = await getCategoryIdsIncludingChildren('hats');
    console.log('Category IDs for hats:', categoryIds);

    const products = await prisma.product.findMany({
        where: {
            categoryId: {
                in: categoryIds
            },
            // Simulate default filters (isActive, isSystem, etc)
            // isActive: true, 
            // isSystem: false 
        },
        select: {
            id: true,
            name: true,
            categoryId: true,
            isActive: true,
            category: {
                select: { name: true }
            }
        }
    });

    console.log(`Found ${products.length} products in 'hats'.`);
    const testProduct = products.find(p => p.name.includes('test222'));
    if (testProduct) {
        console.log('SUCCESS: Found test222 in results:', testProduct);
    } else {
        console.log('FAILURE: test222 NOT found in results.');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
