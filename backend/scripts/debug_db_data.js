const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find one product
    const product = await prisma.product.findFirst({
        where: { slug: 'gildan-softstyle-jersey-t-shirt' }, // Known slug
        include: {
            images: true,
            colorImages: true,
            variants: true
        }
    });

    if (!product) {
        console.log("Product not found!");
        return;
    }

    console.log(`\n=== Product: ${product.name} ===`);
    console.log(`ID: ${product.id}`);

    console.log(`\n--- ProductImages (${product.images.length}) ---`);
    product.images.slice(0, 5).forEach(img => {
        console.log(`[${img.isPrimary ? 'PRI' : '   '}] ColorId: ${img.colorId}, VarId: ${img.variantId}, URL: ${img.url}`);
    });

    console.log(`\n--- ProductColorImages (${product.colorImages.length}) ---`);
    product.colorImages.slice(0, 5).forEach(img => {
        console.log(`ColorName: ${img.colorName}, ColorHex: ${img.colorHex}, ImageUrls: ${JSON.stringify(img.imageUrls)}`);
    });

    console.log(`\n--- Variants (${product.variants.length}) ---`);
    // Group by color to see unique colors
    const uniqueColors = new Set();
    product.variants.forEach(v => {
        if (!uniqueColors.has(v.color)) {
            console.log(`Color: "${v.color}", Hex: "${v.colorHex}", SKU: ${v.sku}`);
            uniqueColors.add(v.color);
        }
    });

    // Check Settings for Color Mappings
    const settings = await prisma.settings.findFirst({
        where: { key: 'site.colorMappings' }
    });
    console.log(`\n--- Settings: site.colorMappings ---`);
    if (settings && settings.value) {
        const mappings = typeof settings.value === 'string' ? JSON.parse(settings.value) : settings.value;
        const mappedNames = mappings.map(m => m.name);
        console.log(`Total Mappings: ${mappings.length}`);
        console.log(`Sample Names: ${mappedNames.slice(0, 10).join(', ')}`);

        // Check exact match for a failing color, e.g. "Royal" vs "Royal Blue"
        console.log(`Mapping for 'Royal': ${mappings.find(m => m.name === 'Royal')?.hex}`);
        console.log(`Mapping for 'Black': ${mappings.find(m => m.name === 'Black')?.hex}`);
    } else {
        console.log("No color mappings found in DB.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
