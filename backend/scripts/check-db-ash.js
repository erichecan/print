const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Checking DB for 176145 and Ash...");

    // Check 176145
    const id176145 = await prisma.productColorImage.findFirst({
        where: { customInkColorId: '176145' }
    });
    console.log("ID 176145:", id176145);

    // Check "Ash"
    const ash = await prisma.productColorImage.findMany({
        where: { colorName: 'Ash' }
    });
    console.log(`Found ${ash.length} 'Ash' records:`);
    ash.forEach(a => console.log(`  ${a.customInkColorId}: ${a.colorName} (${a.colorHex})`));

    // Check "Daisy"
    const daisy = await prisma.productColorImage.findMany({
        where: { colorName: 'Daisy' }
    });
    console.log(`Found ${daisy.length} 'Daisy' records:`);
    daisy.forEach(d => console.log(d));

}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
