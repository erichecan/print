const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Starting Pre-Deployment Data Integrity Check...\n");

    // 1. Check Products for Price Issues
    const zeroPriceCount = await prisma.product.count({
        where: { basePrice: 0 }
    });

    const productsWithNulls = await prisma.$queryRaw`
        SELECT count(*) as count FROM products 
        WHERE description IS NULL 
           OR unit_cost IS NULL 
           OR sale_price IS NULL
    `;
    const nullFieldCount = Number(productsWithNulls[0].count);

    console.log(`[Products] zero_base_price: ${zeroPriceCount} ${zeroPriceCount === 0 ? '✅' : '❌'}`);
    console.log(`[Products] null_essential_fields: ${nullFieldCount} ${nullFieldCount === 0 ? '✅' : '❌'}`);

    // 2. Check Variants for Hex Issues
    const totalVariants = await prisma.variant.count();
    const missingHexVariants = await prisma.variant.count({
        where: {
            OR: [
                { colorHex: null },
                { colorHex: '' } // Check for empty string if applicable
            ]
        }
    });

    console.log(`[Variants] total_count: ${totalVariants}`);
    console.log(`[Variants] missing_hex: ${missingHexVariants} ${missingHexVariants === 0 ? '✅' : '❌'}`);

    // 3. Check ProductColorImages for Content
    const totalColorImages = await prisma.productColorImage.count();
    const badColorImages = await prisma.$queryRaw`
        SELECT count(*) as count FROM product_color_images 
        WHERE color_hex IS NULL 
           OR jsonb_array_length(image_urls) = 0
    `;
    const badColorImageCount = Number(badColorImages[0].count);

    console.log(`[ProductColorImages] total_count: ${totalColorImages}`);
    console.log(`[ProductColorImages] missing_hex_or_images: ${badColorImageCount} ${badColorImageCount === 0 ? '✅' : '❌'}`);

    // 4. Sample Dump (Gildan V-Neck)
    console.log("\n--- Integrity Sample: Gildan Softstyle V-Neck ---");
    const sample = await prisma.product.findFirst({
        where: { slug: 'gildan-softstyle-jersey-v-neck-t-shirt' },
        include: { colorImages: true }
    });

    if (sample) {
        console.log(`Name: ${sample.name}`);
        console.log(`Base Price: ${sample.basePrice}`);
        console.log(`ColorImages Count: ${sample.colorImages.length}`);
        if (sample.colorImages.length > 0) {
            const first = sample.colorImages[0];
            console.log(`Sample ColorImage: ${first.colorName} | Hex: ${first.colorHex} | URLs: ${first.imageUrls.length}`);
        }
    } else {
        console.log("❌ Sample product not found.");
    }

    if (zeroPriceCount === 0 && missingHexVariants === 0 && badColorImageCount === 0) {
        console.log("\n✅ DATA INTEGRITY VERIFIED. READY FOR DEPLOYMENT.");
    } else {
        console.log("\n❌ DATA INTEGRITY ISSUES FOUND. DO NOT DEPLOY.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
