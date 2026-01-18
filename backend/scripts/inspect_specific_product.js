const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const slug = 'port-and-company-womens-fan-favorite-v-neck-t-shirt';
    console.log(`🔍 Checking Product: ${slug}`);

    const product = await prisma.product.findUnique({
        where: { slug },
        include: {
            colorImages: true,
            variants: true
        }
    });

    if (!product) {
        console.log("❌ Product NOT FOUND in DB.");
        return;
    }

    console.log(`✅ Product Found: ${product.name}`);
    console.log(`   ColorImages Count: ${product.colorImages.length}`);

    if (product.colorImages.length > 0) {
        console.log("   --- Color Images Details ---");
        product.colorImages.forEach(ci => {
            console.log(`   Color: '${ci.colorName}' | URLs: ${ci.imageUrls.length}`);
            ci.imageUrls.forEach(u => console.log(`      - ${u}`));
        });
    }

    // Check Variants
    console.log(`   Variants Count: ${product.variants.length}`);
    const uniqueVariantColors = [...new Set(product.variants.map(v => v.color))];
    console.log(`   Variant Colors: ${uniqueVariantColors.join(', ')}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
