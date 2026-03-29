const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking database table owners...');
    try {
        const tableOwners = await prisma.$queryRaw`
      SELECT tablename, tableowner 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
        console.table(tableOwners);

        const currentUser = await prisma.$queryRaw`SELECT current_user;`;
        console.log('👤 Current User:', currentUser[0].current_user);

    } catch (err) {
        console.error('❌ Error checking database:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
