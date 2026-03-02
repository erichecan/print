const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Offline Orders...');

    // 1. Find the demo user
    const user = await prisma.user.findFirst({
        where: { email: 'demo@print.local' }
    });

    if (!user) {
        console.error('❌ User demo@print.local not found. Please run verify_data_integrity or create the user first.');
        process.exit(1);
    }

    console.log(`Found user: ${user.email} (${user.id})`);

    // 2. Create 50 orders
    // Valid statuses: ACTIVE, PRINTED, COMPLETED, CANCELLED, REMINDER
    const statuses = ['ACTIVE', 'PRINTED', 'COMPLETED', 'CANCELLED'];
    const data = [];

    for (let i = 1; i <= 50; i++) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const paddedNum = String(i).padStart(3, '0');

        data.push({
            orderCode: `TEST-ORD-${Date.now()}-${paddedNum}`,
            status: status,
            email: user.email,
            contactName: `${user.firstName || 'Demo'} ${user.lastName || 'User'}`,
            company: 'Test Company Inc.',
            phone: '123-456-7890',
            projectName: `Bulk Order Project #${paddedNum}`,
            description: `Description for #${paddedNum}. Includes random keyword: ${Math.random() > 0.5 ? 'Urgent' : 'Standard'}.`,
            order_notes: `Internal note for #${paddedNum}`,

            // subtotal: 100 * i, // REMOVED
            quantity: 10 * i,

            stageKey: 'draft',
            stageLabel: 'Draft',
            stagePosition: 0,

            metadata: {
                submittedByUserId: user.id,
                offlineConfig: {
                    printMethod: 'DTG',
                    garmentColor: 'Black'
                }
            }
        });
    }

    console.log(`Creating ${data.length} orders...`);

    for (const orderData of data) {
        await prisma.offlineOrder.create({
            data: orderData
        });
    }

    console.log('✅ Seeding complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
