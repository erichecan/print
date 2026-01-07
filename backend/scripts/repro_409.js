const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCreate() {
    const timestamp = Date.now();
    const randomSku = `TEST-SKU-${timestamp}`;
    const randomSlug = `test-slug-${timestamp}`;
    const randomName = `Test Product ${timestamp}`;

    console.log(`Attempting to create product with SKU: ${randomSku}, Slug: ${randomSlug}`);

    try {
        // 1. Get a category id
        const category = await prisma.category.findFirst();
        if (!category) {
            console.error('No category found, cannot test');
            return;
        }

        const result = await prisma.product.create({
            data: {
                name: randomName,
                slug: randomSlug,
                sku: randomSku,
                basePrice: 1000,
                categoryId: category.id,
                // Similar to the controller logic:
                productCategories: {
                    create: {
                        categoryId: category.id,
                    }
                },
                variants: {
                    create: [
                        {
                            color: 'Red',
                            size: 'M',
                            sku: `VAR-SKU-${timestamp}`, // Unique variant SKU
                            priceAdjustment: 0,
                            stockQuantity: 10
                        }
                    ]
                }
            }
        });

        console.log('Success!', result.id);
    } catch (error) {
        console.error('Prisma Error Code:', error.code);
        console.error('Prisma Error Meta:', JSON.stringify(error.meta, null, 2));
        console.error('Full Error Message:', error.message);
    }
}

testCreate()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
