
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const targetId = '13772e8c-a669-4bfe-a0d9-7da1d5617dd3';
    const targetSlug = 'design-lab-default-tee';

    console.log(`Checking for product with ID: ${targetId} OR Slug: ${targetSlug}`);

    // Try to find by ID
    let product = await prisma.product.findUnique({
        where: { id: targetId },
        include: { variants: true, images: true }
    });

    if (!product) {
        console.log(`Product not found by ID. Checking by Slug: ${targetSlug}`);
        product = await prisma.product.findUnique({
            where: { slug: targetSlug },
            include: { variants: true, images: true }
        });
    }

    if (!product) {
        console.log('Product not found at all!');
        return;
    }

    console.log(`Found Product: ${product.name} (${product.id})`);
    console.log(`Slug: ${product.slug}`);
    console.log(`Variants Count: ${product.variants.length}`);
    console.log('Variants:', product.variants.map(v => `${v.color} (${v.id})`));
    console.log('Images:', product.images.map(i => i.url));

    // Determine which variants to delete (Keep "White")
    const whiteVariant = product.variants.find(v => v.color.toLowerCase() === 'white');

    if (!whiteVariant) {
        console.log('WARNING: No "White" variant found! We need to create or rename one.');
        // Check if we have ANY variant, if so, rename first one to White.
        // If not, create one.
    }

    // User request: "Delete this default product's ALL variants, ONLY KEEP one white product image"
    // This implies we need to clean up variants and potentially images.

    // Plan:
    // 1. Ensure a White variant exists.
    // 2. Delete all other variants.
    // 3. Ensure the White variant has the correct white image.
    // 4. Ensure the Product's slug is set correctly (fixing the 404 link issue).

    // FIX: Ensure ID matches the one user complained about.
    if (product.id !== targetId) {
        console.log(`NOTE: The found product ID ${product.id} does not match the URL ID ${targetId}. The URL might be using an old ID or the product was re-seeded.`);
    }

}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
