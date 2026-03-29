require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const products = await prisma.offline_order_products.findMany({
    orderBy: [ { display_order: 'asc' }, { name: 'asc' } ],
    include: { category: { select: { id: true, name: true } }, supplier: { select: { id: true, name: true } } }
  });
  console.log("sample product:", JSON.stringify(products[0], null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
