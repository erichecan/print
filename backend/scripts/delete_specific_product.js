const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const slug = 'port-and-company-womens-fan-favorite-v-neck-t-shirt';
    console.log(`🗑 Deleting product: ${slug}`);

    // Delete cascading? Prisma schema usually handles this or we need to delete children first.
    // Product -> Variants, ProductImage, ProductColorImage
    try {
        const product = await prisma.product.findUnique({ where: { slug } });
        if (!product) {
            console.log("Product not found, already deleted.");
            return;
        }

        // Manual delete children (just in case Cascade isn't at DB level)
        // Use correct model names (camelCase of model definition)
        // Variant, ProductImage, ProductColorImage

        console.log("   Deleting Color Images...");
        await prisma.productColorImage.deleteMany({ where: { productId: product.id } });

        console.log("   Deleting Images...");
        await prisma.productImage.deleteMany({ where: { productId: product.id } });

        console.log("   Deleting Variants...");
        await prisma.variant.deleteMany({ where: { productId: product.id } });

        console.log("   Deleting Product...");
        await prisma.product.delete({ where: { id: product.id } });

        console.log("✅ Product Deleted Successfully.");
    } catch (e) {
        console.error("Error deleting:", e);
    }
}

main()
    .finally(async () => await prisma.$disconnect());
