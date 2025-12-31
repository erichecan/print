require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        const counts = await prisma.user.groupBy({
            by: ['role'],
            _count: {
                role: true,
            },
        });

        console.log('User counts by role:');
        counts.forEach((group) => {
            console.log(`${group.role}: ${group._count.role}`);
        });

        // Also specific queries for verification if needed, but groupBy is efficient.
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
