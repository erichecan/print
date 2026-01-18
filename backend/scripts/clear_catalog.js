const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('⚠️  Clearing Product Catalog...');
    try {
        // Delete in order of dependency
        console.log(' - Deleting ProductColorImages...');
        await prisma.productColorImage.deleteMany({});

        console.log(' - Deleting ProductImages...');
        await prisma.productImage.deleteMany({});

        console.log(' - Deleting Variants...');
        await prisma.variant.deleteMany({});

        console.log(' - Deleting Products...');
        await prisma.product.deleteMany({});

        console.log('✅ Catalog Cleared.');
    } catch (e) {
        console.error('Error clearing catalog:', e);
    }
}

main()
    .finally(async () => await prisma.$disconnect());
