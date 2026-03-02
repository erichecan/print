const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrder() {
    const orderId = '88a71acd-7f9c-49b6-89e5-bdc7766e7748';
    try {
        const order = await prisma.offlineOrder.findUnique({
            where: { id: orderId },
            select: { configuration: true }
        });
        console.log(JSON.stringify(order?.configuration, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkOrder();
