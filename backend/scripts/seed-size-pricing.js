/**
 * Seed Size Pricing Variants (2XL - 5XL)
 * Usage: node backend/scripts/seed-size-pricing.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SIZE_PRICING = [
    { size: '2XL', adjustment: 200 }, // +$2.00
    { size: '3XL', adjustment: 300 }, // +$3.00
    { size: '4XL', adjustment: 400 }, // +$4.00
    { size: '5XL', adjustment: 500 }, // +$5.00
];

async function main() {
    console.log('🚀 Starting Size Pricing Seed...');

    // 1. Get all customizable products (or filter by specific categories if needed)
    const products = await prisma.product.findMany({
        where: {
            isActive: true,
            // Optional: limit to specific categories like T-Shirts if needed
            // category: { slug: 't-shirts' } 
        },
        include: {
            variants: true
        }
    });

    console.log(`Found ${products.length} products to check.`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const product of products) {
        // We assume we base the new variants on an existing "Base" variant (e.g., Size L or just the first one found)
        // to copy color/sku-prefix logic.
        const baseVariant = product.variants.find(v => v.size === 'L' || v.size === 'M') || product.variants[0];

        if (!baseVariant) {
            console.warn(`⚠️  Skipping product ${product.name} (no base variant found)`);
            continue;
        }

        // Identify unique colors existing for this product
        const existingColors = [...new Set(product.variants.map(v => v.color))];

        for (const color of existingColors) {
            // Find the base variant for this specific color to get the correct SKU prefix/colorHex
            const colorBaseVariant = product.variants.find(v => v.color === color);
            if (!colorBaseVariant) continue;

            for (const pricing of SIZE_PRICING) {
                // Check if this specific variant (Product + Color + Size) already exists
                const exists = product.variants.find(v => v.color === color && v.size === pricing.size);

                if (exists) {
                    // Optional: Update price if needed, but for now we skip to avoid overwriting manual changes
                    // await prisma.variant.update({ where: { id: exists.id }, data: { priceAdjustment: pricing.adjustment } });
                    skippedCount++;
                    continue;
                }

                // Create the new variant
                // SKU format assumption: matching existing pattern or appending size
                // If existing SKU is "TS-CLASSIC-BLACK-L", replacing L with 2XL -> "TS-CLASSIC-BLACK-2XL"
                const newSku = colorBaseVariant.sku.replace(new RegExp(`-${colorBaseVariant.size}$`), `-${pricing.size}`);

                await prisma.variant.create({
                    data: {
                        productId: product.id,
                        color: color,
                        colorHex: colorBaseVariant.colorHex,
                        size: pricing.size,
                        sku: newSku, // fallback or calculated
                        stockQuantity: 100, // Default stock
                        priceAdjustment: pricing.adjustment, // KEY FIELD
                        imageUrl: colorBaseVariant.imageUrl
                    }
                });
                createdCount++;
            }
        }
    }

    console.log(`✅ Seed Complete.`);
    console.log(`- Created: ${createdCount} variants`);
    console.log(`- Skipped: ${skippedCount} existing variants`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
