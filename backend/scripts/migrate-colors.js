const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

async function main() {
  try {
    console.log('🚀 Starting color migration...');

    // 1. Get current mappings from settings
    const setting = await prisma.settings.findUnique({
      where: { key: 'site.colorMappings' }
    });

    if (!setting || !setting.value) {
      console.log('❌ No site.colorMappings found in settings table.');
      return;
    }

    const colorMappings = Array.isArray(setting.value) ? setting.value : [];
    console.log(`📋 Found ${colorMappings.length} colors in settings. Ready to migrate...`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const color of colorMappings) {
      const name = color.name || color.productColor;
      const hexCode = Array.isArray(color.values) ? color.values[0] : (color.hexCode || color.hex);

      if (!name) {
        console.warn('⚠️  Skipping color without name:', color);
        skippedCount++;
        continue;
      }

      try {
        // Upsert into offline_order_colors
        await prisma.offline_order_colors.upsert({
          where: { name: name },
          update: {
            hex_code: hexCode || null,
            updated_at: new Date()
          },
          create: {
            id: uuidv4(),
            name: name,
            hex_code: hexCode || null,
            updated_at: new Date()
          }
        });
        migratedCount++;
      } catch (err) {
        console.error(`❌ Failed to migrate color ${name}:`, err.message);
        skippedCount++;
      }
    }

    console.log(`✅ Migration complete!`);
    console.log(`📊 Total: ${colorMappings.length}, Migrated: ${migratedCount}, Skipped: ${skippedCount}`);

  } catch (error) {
    console.error('💥 Critical Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
