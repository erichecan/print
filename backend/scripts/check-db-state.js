const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('--- Checking offline_order_colors table ---');
    const tableColors = await prisma.offline_order_colors.findMany();
    console.log(`Count in offline_order_colors: ${tableColors.length}`);
    if (tableColors.length > 0) {
        console.log('Sample:', JSON.stringify(tableColors.slice(0, 3), null, 2));
    }

    console.log('\n--- Checking settings table ---');
    const settings = await prisma.settings.findMany({
      where: {
        key: {
          contains: 'color'
        }
      }
    });
    console.log('Settings with "color" in key:', JSON.stringify(settings, null, 2));

    const allSettings = await prisma.settings.findMany();
    console.log('\nAll settings keys:', allSettings.map(s => s.key));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
