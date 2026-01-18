const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const https = require('https');
const http = require('http');

async function checkUrl(url) {
    return new Promise((resolve) => {
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
        req.end();
    });
}

async function main() {
    console.log("🔍 Starting Image URL Sanitization Check...");

    // Fetch all ProductColorImages
    const colorImages = await prisma.productColorImage.findMany();
    console.log(`Checking ${colorImages.length} color image records...`);

    let updatedCount = 0;
    let removedUrlCount = 0;

    // Batch process to avoid connection limits
    const BATCH_SIZE = 10;
    for (let i = 0; i < colorImages.length; i += BATCH_SIZE) {
        const batch = colorImages.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (ci) => {
            let hasChanges = false;
            const validUrls = [];

            // Parallel check for URLs in this record
            await Promise.all(ci.imageUrls.map(async (url) => {
                // Heuristic: If it's GCS, assume good (we uploaded it).
                // If it's mms-images (CustomInk), check it.
                if (url.includes('storage.googleapis.com')) {
                    validUrls.push(url);
                } else if (url.includes('mms-images') || url.includes('customink.com')) {
                    const isValid = await checkUrl(url);
                    if (isValid) {
                        validUrls.push(url);
                    } else {
                        // console.log(`❌ Dead Link found: ${url}`);
                        hasChanges = true;
                        removedUrlCount++;
                    }
                } else {
                    // Other URLs, check them
                    const isValid = await checkUrl(url);
                    if (isValid) validUrls.push(url);
                    else {
                        hasChanges = true;
                        removedUrlCount++;
                    }
                }
            }));

            // Re-order? Keep original order strategy (Front first)
            // Just sorting by original index is hard here with async.
            // Let's assume the validUrls order is roughly ok, or we can improve logic.
            // Actually, Promise.all order is preserved? No.
            // Better Logic for preserving order:
            const checkedResults = await Promise.all(ci.imageUrls.map(async (url) => {
                if (url.includes('storage.googleapis.com')) return url;
                const isValid = await checkUrl(url);
                return isValid ? url : null;
            }));
            const finalUrls = checkedResults.filter(u => u !== null);

            if (finalUrls.length !== ci.imageUrls.length) {
                // Update DB
                await prisma.productColorImage.update({
                    where: { id: ci.id },
                    data: { imageUrls: finalUrls }
                });
                updatedCount++;
                process.stdout.write(`.`);
            }
        }));
    }

    console.log(`\n\n✅ Sanitization Complete.`);
    console.log(`Records Updated: ${updatedCount}`);
    console.log(`Dead URLs Removed: ${removedUrlCount}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
