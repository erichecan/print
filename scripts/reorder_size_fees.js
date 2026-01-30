
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SIZE_ORDER = [
    // Infant
    '3/6M', '6/12M', '12/18M', '18/24M',
    // Toddler
    '2T', '3T', '4T', '5T', '6T',
    // Youth
    'YXS', 'YS', 'YM', 'YL', 'YXL',
    // Adult
    'XS', 'S', 'M', 'L', 'XL',
    '2XL', '3XL', '4XL', '5XL', '6XL'
];

async function main() {
    console.log("Starting Size Fee Reordering...");

    // Check existing sizes first to prevent typos
    const allSizes = await prisma.offline_order_size_fees.findMany({ select: { size: true } });
    const dbSizeNames = new Set(allSizes.map(s => s.size));

    // verify we aren't missing any from our authorized list
    const foundOnes = [];
    const missingOnes = [];

    for (const size of SIZE_ORDER) {
        if (dbSizeNames.has(size)) {
            foundOnes.push(size);
        } else {
            console.log(`Note: Size '${size}' defined in order list but not found in DB.`);
        }
    }

    // Check if there are DB sizes NOT in our list
    const orderSet = new Set(SIZE_ORDER);
    const unhandledSizes = allSizes.filter(s => !orderSet.has(s.size)).map(s => s.size);

    if (unhandledSizes.length > 0) {
        console.warn("\nWARNING: The following sizes exist in DB but are not in the ordering list. They will be placed at the end:");
        console.warn(unhandledSizes);
    }

    console.log(`\nUpdating order for ${foundOnes.length} sizes...`);

    // Update in transaction to ensure consistency
    const updates = [];

    // 1. Update known sizes
    foundOnes.forEach((size, index) => {
        updates.push(
            prisma.offline_order_size_fees.update({
                where: { size: size },
                data: { display_order: index + 1 } // Start from 1
            })
        );
    });

    // 2. Update unknown sizes (append to end)
    unhandledSizes.forEach((size, index) => {
        updates.push(
            prisma.offline_order_size_fees.update({
                where: { size: size },
                data: { display_order: SIZE_ORDER.length + index + 1 }
            })
        );
    });

    await prisma.$transaction(updates);

    console.log("✅ Successfully updated display orders!");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
