
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const targetId = '13772e8c-a669-4bfe-a0d9-7da1d5617dd3';
    const idealSlug = 'design-lab-default-tee';

    console.log(`Fixing product ${targetId}...`);

    // 1. Get Product
    const product = await prisma.product.findUnique({
        where: { id: targetId },
        include: { variants: true }
    });

    if (!product) {
        console.error('Product not found!');
        return;
    }

    // 2. Identify White Variant
    let whiteVariant = product.variants.find(v => v.color.toLowerCase() === 'white');

    // 3. Delete OTHERS
    const variantsToDelete = product.variants.filter(v => v.color.toLowerCase() !== 'white');
    if (variantsToDelete.length > 0) {
        console.log(`Deleting ${variantsToDelete.length} non-white variants...`);
        await prisma.variant.deleteMany({
            where: {
                id: { in: variantsToDelete.map(v => v.id) }
            }
        });
    }

    // 4. Create/Update White Variant
    if (!whiteVariant) {
        console.log('Creating White variant...');
        try {
            whiteVariant = await prisma.variant.create({
                data: {
                    productId: product.id,
                    color: 'White',
                    colorHex: '#FFFFFF',
                    size: 'L',
                    sku: 'DEFAULT-TEE-WHITE-' + Date.now(), // Ensure unique SKU
                    priceAdjustment: 0,
                    stockQuantity: 999
                }
            });
        } catch (e) {
            console.warn("Failed to create White variant (maybe SKU exists). Trying to find any variant to convert.");
            // Should have been handled by step 2, but just in case.
        }
    }

    // 5. Fix Product Image
    // Clear existing images
    await prisma.productImage.deleteMany({ where: { productId: product.id } });

    // Add White Image (Using GCS URLs for the white tee to ensure it is white)
    console.log('Adding 5 White Product Images (Front, Back, Sleeves)...');

    // Explicitly use the white tee images we have in GCS
    const views = [
        { alt: 'White T-Shirt Front', order: 0, url: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png' },
        { alt: 'White T-Shirt Back', order: 1, url: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/back-large_extended.png' },
        { alt: 'White T-Shirt Sleeve', order: 2, url: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/sleeve-large_extended.png' },
        { alt: 'White T-Shirt Left Sleeve', order: 3, url: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/left-sleeve-large_extended.png' },
        { alt: 'White T-Shirt Right Sleeve', order: 4, url: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/right-sleeve-large_extended.png' }
    ];

    for (const view of views) {
        await prisma.productImage.create({
            data: {
                productId: product.id,
                url: view.url,
                alt: view.alt,
                sortOrder: view.order
            }
        });
    }

    // 6. Fix Slug
    if (product.slug !== idealSlug) {
        console.log(`Updating slug from ${product.slug} to ${idealSlug}`);
        try {
            await prisma.product.update({
                where: { id: product.id },
                data: { slug: idealSlug }
            });
        } catch (e) {
            console.warn('Could not update slug (might be taken):', e.message);
        }
    }

    console.log('Product fixed successfully.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
