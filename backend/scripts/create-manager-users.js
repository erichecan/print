const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const USERS = [
    {
        email: 'Thea@souvenirplus.com',
        password: 'manager@1600Print',
        firstName: 'Thea',
        lastName: 'Admin',
        role: 'ADMIN' // Role from UserRole enum
    },
    {
        email: 'Patrick@souvenirplus.com',
        password: 'manager@1600Print',
        firstName: 'Patrick',
        lastName: 'Admin',
        role: 'ADMIN'
    }
];

async function main() {
    console.log('🌱 Creating manager users (Thea & Patrick)...');

    for (const userConfig of USERS) {
        const hashedPassword = await bcrypt.hash(userConfig.password, 10);
        // Use lowercase email for consistency/storage
        const finalEmail = userConfig.email.toLowerCase();

        console.log(`Processing user: ${finalEmail}`);

        const existingUser = await prisma.user.findUnique({
            where: { email: finalEmail },
        });

        if (existingUser) {
            console.log(`✅ User exists, updating password and role...`);
            await prisma.user.update({
                where: { email: finalEmail },
                data: {
                    passwordHash: hashedPassword,
                    role: userConfig.role,
                    emailVerified: true,
                    firstName: userConfig.firstName,
                    lastName: userConfig.lastName
                }
            });
            console.log(`   Updated ${finalEmail}`);
        } else {
            console.log(`⚠️  User not found, creating new user...`);
            await prisma.user.create({
                data: {
                    email: finalEmail,
                    passwordHash: hashedPassword,
                    firstName: userConfig.firstName,
                    lastName: userConfig.lastName,
                    role: userConfig.role,
                    emailVerified: true
                }
            });
            console.log(`   Created ${finalEmail}`);
        }
    }
    console.log('\n✅ All manager users verified/created successfully!');
}

main()
    .catch(e => {
        console.error('❌ Error creating users:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
