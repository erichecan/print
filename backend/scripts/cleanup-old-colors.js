const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Cleaning up old color records...");

    // Find all records
    const allRecords = await prisma.productColorImage.findMany({
        select: {
            id: true,
            customInkProductId: true,
            colorName: true,
            createdAt: true
        }
    });

    console.log(`Total records: ${allRecords.length}`);

    // Identify records with long IDs (Legacy UUIDs) or created before 2026
    const toDelete = allRecords.filter(r => {
        const isLongId = r.customInkProductId && r.customInkProductId.length > 10;
        const isOld = new Date(r.createdAt).getFullYear() < 2026;
        return isLongId || isOld;
    }).map(r => r.id);

    console.log(`Found ${toDelete.length} legacy records to delete.`);

    if (toDelete.length > 0) {
        const result = await prisma.productColorImage.deleteMany({
            where: {
                id: { in: toDelete }
            }
        });
        console.log(`Deleted ${result.count} records.`);
    } else {
        console.log("No legacy records found.");
    }

    // Verify 176145
    const daisy = await prisma.productColorImage.findFirst({
        where: { customInkColorId: '176145' }
    });
    console.log("Remaining 176145 record:", daisy);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
