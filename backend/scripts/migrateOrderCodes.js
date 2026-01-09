/**
 * Migration script to update existing offline order codes to the new format: OFF-YYMMDD-NN
 * Usage: node scripts/migrateOrderCodes.js [--dry-run]
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const isDryRun = process.argv.includes('--dry-run');
    console.log(isDryRun ? '--- DRY RUN MODE ---' : '--- EXECUTION MODE ---');

    // Fetch all orders sorted by creation date
    const orders = await prisma.offlineOrder.findMany({
        orderBy: {
            createdAt: 'asc'
        }
    });

    console.log(`Found ${orders.length} orders to process.`);

    const ordersByDate = {};

    // Group orders by localized date (to handle sequence per day correctly)
    orders.forEach(order => {
        const date = new Date(order.createdAt);
        const dateKey = date.toISOString().slice(0, 10).replace(/-/g, '').substring(2); // YYMMDD
        if (!ordersByDate[dateKey]) {
            ordersByDate[dateKey] = [];
        }
        ordersByDate[dateKey].push(order);
    });

    let totalUpdated = 0;

    for (const [datePart, dayOrders] of Object.entries(ordersByDate)) {
        console.log(`Processing ${dayOrders.length} orders for date: ${datePart}`);

        for (let i = 0; i < dayOrders.length; i++) {
            const order = dayOrders[i];
            const sequenceNum = i + 1;
            const sequencePart = String(sequenceNum).padStart(2, '0');
            const newCode = `OFF-${datePart}-${sequencePart}`;

            if (order.orderCode === newCode) {
                console.log(`  Skip unchanged: ${order.orderCode}`);
                continue;
            }

            console.log(`  Update: ${order.orderCode} -> ${newCode}`);

            if (!isDryRun) {
                await prisma.offlineOrder.update({
                    where: { id: order.id },
                    data: { orderCode: newCode }
                });
            }
            totalUpdated++;
        }
    }

    console.log(`\nFinished. Total records ${isDryRun ? 'to be updated' : 'updated'}: ${totalUpdated}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
