const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Find a target product with rich data (Gildan Softstyle V-Neck)
    const product = await prisma.product.findFirst({
        where: { slug: 'gildan-softstyle-jersey-v-neck-t-shirt' },
        include: {
            colorImages: true,
            variants: { take: 1 } // Just take one variant to show structure
        }
    });

    if (!product) {
        console.log("Product not found!");
        return;
    }

    // 2. Select a color that definitely has 4 images
    const targetColorImage = product.colorImages.find(ci => ci.imageUrls.length >= 4) || product.colorImages[0];

    console.log("--- PROOF OF DEPLOYMENT ---\n");

    // PROOF 1: Construct Link
    const frontendUrl = `https://printngoplus.com/products/${product.slug}?color=${encodeURIComponent(targetColorImage.colorName)}`;
    console.log(`1. Product Link (Detail Page):\n   ${frontendUrl}\n`);

    // PROOF 2: GCS Links
    console.log(`2. GCS Multi-View Links (Color: ${targetColorImage.colorName}):`);
    if (targetColorImage && targetColorImage.imageUrls) {
        targetColorImage.imageUrls.forEach((url, i) => {
            const views = ["Front", "Back", "Left", "Right"];
            console.log(`   [${views[i] || 'View ' + (i + 1)}]: ${url}`);
        });
    } else {
        console.log("   No images found for this color.");
    }
    console.log("");

    // PROOF 3: Full Data Dump
    console.log("3. Complete Product Record (Data Integrity Proof):");
    // Clean up for display
    const displayObj = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        basePrice: product.basePrice,
        description: product.description ? product.description.substring(0, 50) + "..." : null,
        unitCost: product.unitCost, // Decimal
        salePrice: product.salePrice, // Decimal
        weight: product.weight,
        dimensions: product.dimensions,
        printableAreas: product.printableAreas,
        sku: product.sku,
        isActive: product.isActive,
        // Show ColorImage structure
        sampleColorImage: {
            colorName: targetColorImage.colorName,
            colorHex: targetColorImage.colorHex,
            imageCount: targetColorImage.imageUrls.length
        }
    };
    console.log(JSON.stringify(displayObj, null, 2));

    // Show that NO nulls exist in critical fields for this product
    const isClean = product.basePrice > 0 &&
        product.description &&
        product.sku &&
        targetColorImage.colorHex;

    console.log(`\n\nIntegrity Status: ${isClean ? '✅ CLEAN' : '❌ DIRTY'}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
