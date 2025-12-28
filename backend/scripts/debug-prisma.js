
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('Prisma Client keys:', Object.keys(prisma));

// Check specifically for expected variation
const variations = [
    'offlineOrderSizeFee',
    'OfflineOrderSizeFee',
    'offline_order_size_fees',
    'offlineOrderSizeFees'
];

variations.forEach(key => {
    console.log(`prisma.${key} exists:`, !!prisma[key]);
});

prisma.$disconnect();
