
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testVariantUpdate() {
    // 1. Get test222 id
    const product = await prisma.product.findFirst({ where: { name: 'test222' } });
    if (!product) {
        console.log('Product test222 not found');
        return;
    }
    console.log('Found product:', product.id);

    // 2. Simulate payload with new variants
    const variantsPayload = [
        {
            productId: product.id,
            color: 'Blue',
            size: 'L',
            sku: 'TEST222-BLUE-L',
            stockQuantity: 10,
            priceAdjustment: 0
        },
        {
            productId: product.id,
            color: 'Red',
            size: 'M',
            sku: 'TEST222-RED-M',
            stockQuantity: 5,
            priceAdjustment: 0
        }
    ];

    // 3. Call update logic directly via prisma (simulating controller)
    // Replicating logic from adminProductController.updateProduct
    console.log('Updating variants...');

    await prisma.$transaction(async (tx) => {
        const id = product.id;
        const variants = variantsPayload;

        // 获取所有现有变体
        const existingVariants = await tx.variant.findMany({
            where: { productId: id }
        });
        const existingVariantIds = new Set(existingVariants.map(v => v.id));
        const incomingVariantIds = new Set(variants.filter(v => v.id).map(v => v.id));

        console.log('Existing count:', existingVariants.length);

        // 1. 更新或创建传入的变体
        for (const variant of variants) {
            const variantData = {
                productId: id,
                color: variant.color || 'UNSET',
                colorHex: variant.colorHex || null,
                size: variant.size || 'ONE',
                sku: variant.sku,
                priceAdjustment: variant.priceAdjustment, // decimals omitted for test
                stockQuantity: variant.stockQuantity,
                imageUrl: null,
            };

            if (variant.id && existingVariantIds.has(variant.id)) {
                // update
            } else {
                // 如果没有 ID，尝试按 SKU 匹配
                const matchBySku = existingVariants.find(v => v.sku === variant.sku);
                if (matchBySku) {
                    await tx.variant.update({
                        where: { id: matchBySku.id },
                        data: variantData
                    });
                    incomingVariantIds.add(matchBySku.id);
                    console.log('Updated existing by SKU:', variant.sku);
                } else {
                    await tx.variant.create({
                        data: variantData
                    });
                    console.log('Created new:', variant.sku);
                }
            }
        }
    });

    console.log('Update complete. Verifying...');
    const updated = await prisma.product.findUnique({
        where: { id: product.id },
        include: { variants: true }
    });
    console.log('Final variants count:', updated.variants.length);
    console.log(updated.variants);
}

testVariantUpdate()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
