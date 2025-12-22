const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 前端定义的颜色映射表 (从 apps/web/src/lib/product-data.ts 复制)
const PRODUCT_COLORS = [
    { name: 'White', hex: '#ffffff' },
    { name: 'Navy', hex: '#1c203b' },
    { name: 'Maroon', hex: '#731f39' },
    { name: 'Black', hex: '#000000' },
    { name: 'Sport Grey', hex: '#afafaf' },
    { name: 'Heather Dark Grey', hex: '#545454' },
    { name: 'Red', hex: '#f40928' },
    { name: 'Royal Blue', hex: '#395389' },
    { name: 'Forest Green', hex: '#cccccc' },
    { name: 'Purple', hex: '#4f237a' },
    { name: 'Pink', hex: '#cccccc' },
    { name: 'Orange', hex: '#dc582a' },
    { name: 'Yellow', hex: '#cccccc' },
    { name: 'Charcoal', hex: '#494949' },
    { name: 'Heather Blue', hex: '#cccccc' },
    { name: 'Heather Red', hex: '#a54d58' },
    { name: 'Light Blue', hex: '#afcdf3' },
    { name: 'Kelly Green', hex: '#33755a' },
    { name: 'Lime', hex: '#86b660' },
    { name: 'Gold', hex: '#e79628' },
    { name: 'Silver', hex: '#cccccc' },
    { name: 'Brown', hex: '#cccccc' },
    { name: 'Tan', hex: '#cccccc' },
    { name: 'Olive', hex: '#cccccc' },
    { name: 'Teal', hex: '#cccccc' },
    { name: 'Burgundy', hex: '#cccccc' },
    { name: 'Dark Heather', hex: '#4d4d4d' },
    { name: 'Light Pink', hex: '#e6c7da' },
    { name: 'Hot Pink', hex: '#cccccc' },
    { name: 'Coral', hex: '#cccccc' },
    { name: 'Peach', hex: '#cccccc' },
    { name: 'Lavender', hex: '#cccccc' },
    { name: 'Mint', hex: '#cccccc' },
    { name: 'Turquoise', hex: '#cccccc' },
    { name: 'Sky Blue', hex: '#cccccc' },
    { name: 'Navy Blue', hex: '#1c203b' },
    { name: 'Royal', hex: '#395389' },
    { name: 'Carolina Blue', hex: '#92b0e6' },
    { name: 'Sapphire', hex: '#0387b8' },
    { name: 'Steel Blue', hex: '#cccccc' },
    { name: 'Slate', hex: '#cccccc' },
    { name: 'Steel', hex: '#cccccc' },
    { name: 'Graphite Heather', hex: '#7f7f7f' },
    { name: 'Charcoal Heather', hex: '#4a4a4a' },
    { name: 'Heather', hex: '#cccccc' },
    { name: 'Ash', hex: '#cccccc' },
    { name: 'Natural', hex: '#e9e3cb' },
    { name: 'Sand', hex: '#d1c8b7' },
    { name: 'Cream', hex: '#cccccc' },
    { name: 'Ivory', hex: '#cccccc' },
    { name: 'Light Grey', hex: '#cccccc' },
    { name: 'Grey', hex: '#cccccc' },
    { name: 'Dark Grey', hex: '#cccccc' },
    { name: 'Gunmetal', hex: '#cccccc' },
    { name: 'Midnight', hex: '#cccccc' },
    { name: 'Indigo', hex: '#cccccc' },
    { name: 'Plum', hex: '#cccccc' },
    { name: 'Wine', hex: '#cccccc' },
    { name: 'Cranberry', hex: '#cccccc' },
    { name: 'Cardinal', hex: '#cccccc' },
    { name: 'Scarlet', hex: '#cccccc' },
    { name: 'Cherry Red', hex: '#d2023e' },
    { name: 'Orange Red', hex: '#cccccc' },
    { name: 'Safety Orange', hex: '#ff6600' },
    { name: 'Safety Green', hex: '#ccff33' },
    { name: 'Safety Yellow', hex: '#cccccc' },
    { name: 'Safety Pink', hex: '#ff33cc' },
    { name: 'Safety Blue', hex: '#cccccc' },
    { name: 'Safety Purple', hex: '#cccccc' },
    { name: 'Safety Lime', hex: '#cccccc' },
    { name: 'Safety Aqua', hex: '#cccccc' },
    { name: 'Safety Brown', hex: '#cccccc' },
    { name: 'Safety Tan', hex: '#cccccc' },
    { name: 'Safety Navy', hex: '#cccccc' },
    { name: 'Safety Black', hex: '#cccccc' },
    { name: 'Safety White', hex: '#cccccc' },
    { name: 'Safety Grey', hex: '#cccccc' },
    // 各种 Safety 重复定义，确保覆盖
    { name: 'Safety Orange', hex: '#ff6600' },
    { name: 'Safety Green', hex: '#ccff33' },
    { name: 'Safety Yellow', hex: '#cccccc' },
    { name: 'Safety Pink', hex: '#ff33cc' },
];

async function main() {
    console.log('Starting to seed Design Lab product with variants and backfill color hexes...');

    // 1. 获取或创建 Category
    let category = await prisma.category.findUnique({
        where: { slug: 't-shirts' }
    });

    if (!category) {
        console.log('Creating T-Shirts category...');
        category = await prisma.category.create({
            data: {
                name: 'T-Shirts',
                slug: 't-shirts',
                description: 'Quality T-Shirts',
            }
        });
    }

    // 2. 创建 Design Lab 默认产品 (Gildan Softstyle - 全色系)
    const productSlug = 'design-lab-default-tee';
    const productName = 'Design Lab Default Tee (Gildan Softstyle)';

    // 检查是否已存在
    let product = await prisma.product.findUnique({
        where: { slug: productSlug }
    });

    if (product) {
        console.log(`Product ${productSlug} already exists. Updating...`);
    } else {
        console.log(`Creating new product ${productSlug}...`);
        product = await prisma.product.create({
            data: {
                name: productName,
                slug: productSlug,
                description: 'The perfect canvas for your design.',
                basePrice: 1500, // $15.00
                categoryId: category.id,
                sku: 'DL-DEFAULT-TEE-001',
                isCustomizable: true,
                isActive: true,
            }
        });
    }

    // 3. 为该产品创建全套颜色的 Variants (S, M, L, XL)
    const sizes = ['S', 'M', 'L', 'XL'];

    console.log(`Generating variants for ${productName}...`);

    for (const colorData of PRODUCT_COLORS) {
        for (const size of sizes) {
            const sku = `DL-TEE-${colorData.name.replace(/\s+/g, '-').toUpperCase()}-${size}`;

            const existingVariant = await prisma.variant.findUnique({
                where: { sku }
            });

            if (!existingVariant) {
                await prisma.variant.create({
                    data: {
                        productId: product.id,
                        color: colorData.name,
                        colorHex: colorData.hex, // 写入 hex
                        size: size,
                        sku: sku,
                        priceAdjustment: size === 'XL' ? 200 : 0, // XL +$2.00
                        stockQuantity: 999,
                    }
                });
                // console.log(`Created variant: ${sku}`);
            } else {
                // 更新 hex
                await prisma.variant.update({
                    where: { id: existingVariant.id },
                    data: { colorHex: colorData.hex }
                });
            }
        }
    }
    console.log('✅ Design Lab Default Product and Variants seeded successfully.');

    // 4. Backfill colorHex for ALL existing variants in the database
    console.log('Backfilling colorHex for all other products...');

    // 获取所有没有 colorHex 或者 colorHex 为空的 variants (简化起见，遍历所有)
    const allVariants = await prisma.variant.findMany();

    let updatedCount = 0;
    for (const variant of allVariants) {
        // 尝试在映射表中找颜色
        const matchedColor = PRODUCT_COLORS.find(c => c.name.toLowerCase() === variant.color.toLowerCase());

        if (matchedColor) {
            // 如果当前没有 hex 或者 hex 不匹配，则更新
            if (variant.colorHex !== matchedColor.hex) {
                await prisma.variant.update({
                    where: { id: variant.id },
                    data: { colorHex: matchedColor.hex }
                });
                updatedCount++;
            }
        }
    }

    console.log(`✅ Updated colorHex for ${updatedCount} variants across the database.`);
    console.log('Script completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
