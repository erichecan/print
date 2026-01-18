const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find unique color names that have null Hex in Variants
    const missingHexVariants = await prisma.variant.findMany({
        where: { colorHex: null },
        select: { color: true },
        distinct: ['color']
    });

    console.log(`--- Missing Hex in Variants (${missingHexVariants.length} unique colors) ---`);
    missingHexVariants.forEach(v => console.log(v.color));

    // Find unique color names that have null Hex in ProductColorImages
    const missingHexImages = await prisma.productColorImage.findMany({
        where: { colorHex: null },
        select: { colorName: true },
        distinct: ['colorName']
    });

    console.log(`\n--- Missing Hex in ProductColorImages (${missingHexImages.length} unique colors) ---`);
    missingHexImages.forEach(img => console.log(img.colorName));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
