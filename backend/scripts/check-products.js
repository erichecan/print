
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Products ---');
    const products = await prisma.product.findMany({
        where: { isActive: true, isCustomizable: true },
        take: 5,
        include: { variants: { take: 1 } }
    });

    if (products.length === 0) {
        console.log('❌ No active customizable products found.');
    } else {
        console.log(`✅ Found ${products.length} products.`);
        products.forEach(p => {
            console.log(`- ${p.name} (Slug: ${p.slug})`);
            if (p.variants.length > 0) {
                console.log(`  Default Variant ID: ${p.variants[0].id}`);
            } else {
                console.log('  ⚠️ No variants!');
            }
        });
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
