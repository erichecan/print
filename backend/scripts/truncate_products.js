require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  Starting Product Table Cleanup...');

    try {
        // Option 1: Try DeleteMany (safer, respects constraints)
        console.log('Attempting to delete all products...');
        const result = await prisma.product.deleteMany({});
        console.log(`✅ Deleted ${result.count} products.`);

        // Note: Variant, ProductImage, ProductColorImage, ProductCategory 
        // should be deleted automatically via Cascade if configured in DB.
        // If Prisma schema says @relation(..., onDelete: Cascade), Prisma Migrate 
        // creates the foreign key with ON DELETE CASCADE.

        // Let's verify counts
        const pCount = await prisma.product.count();
        const vCount = await prisma.variant.count();
        const iCount = await prisma.productImage.count();

        console.log(`Remaining counts: Products=${pCount}, Variants=${vCount}, Images=${iCount}`);

        if (pCount === 0 && vCount > 0) {
            console.warn('⚠️  Variants remain! Cascade delete might not be configured on DB level.');
            console.log('Cleaning up orphaned variants...');
            await prisma.variant.deleteMany({});
        }

    } catch (error) {
        if (error.code === 'P2003') { // Foreign key constraint failed
            console.error('❌ Failed to delete products due to existing references (e.g. Orders, Designs).');
            console.error('   Please clear dependent data first or use a force/truncate strategy if this is a dev env.');
        } else {
            console.error('❌ Error cleaning up products:', error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
