/**
 * Seed Offline Order Size Fees
 * Usage: node backend/scripts/seed-offline-order-fees.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

const SIZE_FEES = [
    { size: '2XL', fee: 2.00 },
    { size: '3XL', fee: 3.00 },
    { size: '4XL', fee: 4.00 },
    { size: '5XL', fee: 5.00 },
];

async function main() {
    console.log('🚀 Starting Offline Order Size Fees Seed...');

    for (const item of SIZE_FEES) {
        const existing = await prisma.offline_order_size_fees.findUnique({
            where: { size: item.size },
        });

        if (existing) {
            console.log(`Update ${item.size} fee to ${item.fee}`);
            await prisma.offline_order_size_fees.update({
                where: { size: item.size },
                data: { additional_fee: item.fee, updated_at: new Date() },
            });
        } else {
            console.log(`Create ${item.size} fee ${item.fee}`);
            await prisma.offline_order_size_fees.create({
                data: {
                    id: uuidv4(),
                    size: item.size,
                    additional_fee: item.fee,
                    updated_at: new Date(),
                },
            });
        }
    }

    console.log('✅ Seed Complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
