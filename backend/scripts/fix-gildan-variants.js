const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const productId = 'e29367fa-a0ff-4b54-922c-b76ba4831d23';
    console.log(`Checking product ${productId}...`);

    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { variants: true }
    });

    if (!product) {
        console.error('Product not found!');
        return;
    }

    console.log(`Product found: ${product.name}, variants: ${product.variants.length}`);

    if (product.variants.length === 0) {
        console.log('Creating default variants...');
        const variants = [
            { color: 'White', hex: '#FFFFFF', size: 'S' },
            { color: 'White', hex: '#FFFFFF', size: 'M' },
            { color: 'White', hex: '#FFFFFF', size: 'L' },
            { color: 'White', hex: '#FFFFFF', size: 'XL' },
            { color: 'Black', hex: '#000000', size: 'M' }
        ];

        for (const v of variants) {
            await prisma.variant.create({
                data: {
                    productId: product.id,
                    color: v.color,
                    colorHex: v.hex,
                    size: v.size,
                    stockQuantity: 100,
                    sku: `GILDAN-${v.color.toUpperCase()}-${v.size}-FIX`,
                    priceAdjustment: 0
                }
            });
            console.log(`Created ${v.color} ${v.size}`);
        }
    } else {
        console.log('Variants already exist.');
    }

    console.log('Done.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
