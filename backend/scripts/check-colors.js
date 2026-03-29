const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const colors = await prisma.offlineOrderColor.findMany();
    console.log('--- Offline Order Colors ---');
    console.log(JSON.stringify(colors, null, 2));
    console.log('Total count:', colors.length);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
