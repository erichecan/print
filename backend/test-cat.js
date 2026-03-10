const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const cats = await prisma.category.findMany({
    where: { isActive: true },
    take: 200,
  });
  console.log("Found:", cats.length);
  console.log(cats.map(c => c.name).join(', '));
}
run();
