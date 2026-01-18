const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('📊 Analyzing Product Images...');

    // 1. Check ProductColorImages (The rich data)
    const colorImages = await prisma.productColorImage.findMany({});
    console.log(`Found ${colorImages.length} ProductColorImage records.`);

    let stats = {
        total_urls: 0,
        front: 0,
        back: 0,
        left: 0,
        right: 0,
        left_sleeve: 0,
        right_sleeve: 0,
        extended: 0,
        other: 0
    };

    let sample = null;

    for (const ci of colorImages) {
        if (!ci.imageUrls || !Array.isArray(ci.imageUrls)) continue;

        stats.total_urls += ci.imageUrls.length;
        if (!sample && ci.imageUrls.length > 2) sample = ci;

        for (const url of ci.imageUrls) {
            const lower = url.toLowerCase();
            if (lower.includes('front')) stats.front++;
            else if (lower.includes('back')) stats.back++;
            else if (lower.includes('left_sleeve')) stats.left_sleeve++;
            else if (lower.includes('right_sleeve')) stats.right_sleeve++;
            else if (lower.includes('left')) stats.left++; // catch-all left
            else if (lower.includes('right')) stats.right++; // catch-all right
            else stats.other++;

            if (lower.includes('extended')) stats.extended++;
        }
    }

    console.log('\n--- Image Type Distribution ---');
    console.log(stats);

    if (sample) {
        console.log('\n--- Sample Record (with >2 images) ---');
        console.log(`Product ID: ${sample.customInkProductId} | Color: ${sample.colorName}`);
        console.log(JSON.stringify(sample.imageUrls, null, 2));
    } else {
        console.log('\n⚠️ NO records found with > 2 images!');
    }
}

main()
    .finally(async () => await prisma.$disconnect());
