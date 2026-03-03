/**
 * Seed Size Pricing Variants (2XL - 5XL)
 * Usage: node backend/scripts/seed-size-pricing.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// [2026-03-03 12:55:00] 正则转义，避免 size 含特殊字符导致 replace 异常
function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

        // [2026-03-03 12:55:00] 只从「标准尺码」变体取颜色，避免 seed-variants 的 UNSET/ONE 导致 SKU 重复
        const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
        const variantsWithStandardSize = product.variants.filter((v) =>
            STANDARD_SIZES.includes(v.size) && v.color && v.color !== 'UNSET'
        );
        const existingColors = [...new Set(variantsWithStandardSize.map((v) => v.color))];

        for (const color of existingColors) {
            // Find the base variant for this specific color to get the correct SKU prefix/colorHex（优先 L/M）
            const colorBaseVariant =
                product.variants.find((v) => v.color === color && (v.size === 'L' || v.size === 'M')) ||
                product.variants.find((v) => v.color === color && STANDARD_SIZES.includes(v.size));
            if (!colorBaseVariant) continue;

            for (const pricing of SIZE_PRICING) {
                const exists = product.variants.find((v) => v.color === color && v.size === pricing.size);
                if (exists) {
                    skippedCount++;
                    continue;
                }

                // SKU：用末尾尺码替换；若替换无效（如 xxx-VAR1 无 -ONE 后缀）则用 原SKU-尺码 保证唯一
                let newSku = colorBaseVariant.sku.replace(
                    new RegExp(`-${escapeRegExp(colorBaseVariant.size)}$`),
                    `-${pricing.size}`
                );
                if (newSku === colorBaseVariant.sku) {
                    newSku = `${colorBaseVariant.sku}-${pricing.size}`;
                }

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
