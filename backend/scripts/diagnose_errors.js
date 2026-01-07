const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ids = [
    '0698a47a-229a-4050-996d-ed5cfed965f0',
    'e5c0e679-8142-476b-9669-2d3424c9d30c',
    '82f7b323-a741-4cee-9bfb-dadfe6a6ada6',
    'af87dc8c-c24e-415f-8344-e8e2f455deb1',
    '4b019fd7-5bfb-4868-8626-467c30a3f943',
    'be1e463a-d174-4080-8f3c-d92dc4ab65f8',
    'ff74693e-3c17-48ba-8c58-0c9ddbd30c48',
    'ac47d40d-9213-4328-a44f-c50fd3b15a90',
    '8bd8d554-f708-4720-905c-d0959d08a752'
];

async function main() {
    console.log('--- Checking 404 Offline Order IDs ---');
    for (const id of ids) {
        const order = await prisma.offlineOrder.findUnique({
            where: { id },
            select: { id: true, orderCode: true, projectName: true }
        });
        console.log(`ID ${id}: ${order ? `Found (${order.orderCode} - ${order.projectName})` : 'NOT FOUND'}`);
    }

    console.log('\n--- Checking for potential SKU/Slug Conflicts ---');
    // Just a sample check for recent products or common names if possible
    // Since I don't know the SKU/Slug they tried, I'll just check the most recent products
    const recentProducts = await prisma.product.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, slug: true, sku: true }
    });
    console.log('Recent Products:');
    recentProducts.forEach(p => console.log(`- ${p.name} (Slug: ${p.slug}, SKU: ${p.sku})`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
