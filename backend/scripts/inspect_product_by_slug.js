const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const slug = 'allpro-blended-pique-polo';
    console.log(`🔍 Inspecting Product: ${slug}`);

    const product = await prisma.product.findUnique({
        where: { slug },
        include: {
            images: true,
            colorImages: true,
            variants: true
        }
    });

    if (!product) {
        console.error('❌ Product not found');
        return;
    }

    console.log(`\nProduct Info:`);
    console.log(`- Name: ${product.name}`);
    console.log(`- Images Count: ${product.images.length}`);
    console.log(`- ColorImages Count: ${product.colorImages.length}`);
    console.log(`- Variants Count: ${product.variants.length}`);

    console.log(`\n--- Variants Details ---`);
    product.variants.forEach(v => {
        console.log(`ID: ${v.id} | Color: '${v.color}' | Hex: ${v.colorHex} | Available: ${v.stockQuantity > 0}`);
    });

    console.log(`\n--- ColorImages Details ---`);
    product.colorImages.forEach(ci => {
        console.log(`Color: '${ci.colorName}' | Images: ${ci.imageUrls.length}`);
        ci.imageUrls.forEach(url => console.log(`  - ${url}`));
    });

    console.log(`\n--- Images (Generic/Linked) ---`);
    product.images.forEach(img => {
        console.log(`ID: ${img.id} | Sort: ${img.sortOrder} | Alt: ${img.alt} | URL: ${img.url}`);
    });
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
