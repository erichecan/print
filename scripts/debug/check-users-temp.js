require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { email: { contains: 'yoyo', mode: 'insensitive' } },
                { email: { contains: 'mia', mode: 'insensitive' } },
                { firstName: { contains: 'yoyo', mode: 'insensitive' } },
                { firstName: { contains: 'mia', mode: 'insensitive' } }
            ]
        },
        select: { email: true, firstName: true, role: true }
    });
    console.log('Found users:', users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
