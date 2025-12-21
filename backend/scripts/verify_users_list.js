const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Connecting to database to verify users...');
    try {
        const users = await prisma.user.findMany({
            select: {
                email: true,
                role: true,
                firstName: true,
                lastName: true
            },
            orderBy: {
                role: 'asc'
            }
        });

        console.log('\n✅ Verified User List from Database:');
        console.log('----------------------------------------');
        if (users.length === 0) {
            console.log('No users found.');
        } else {
            users.forEach(u => {
                console.log(`[${u.role}] ${u.email} (${u.firstName} ${u.lastName})`);
            });
        }
        console.log('----------------------------------------');
        console.log(`Total users: ${users.length}`);

    } catch (error) {
        console.error('Error connecting to database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
