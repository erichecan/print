// [2026-03-03 13:25:00] 单独运行此脚本时需指定「生产后端」使用的 DATABASE_URL，否则登录仍会 401
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// [2026-03-03 13:20:00] 使用最新提供的管理员账号列表（printngoplus 域名 + eric/yoyo/mia）
const USERS = [
    {
        email: 'thea@printngoplus.com',
        password: 'manager@1600Print',
        firstName: 'Thea',
        lastName: 'Admin',
        role: 'ADMIN',
    },
    {
        email: 'patrick@printngoplus.com',
        password: 'manager@1600Print',
        firstName: 'Patrick',
        lastName: 'Admin',
        role: 'ADMIN',
    },
    {
        email: 'erichecan@gmail.com',
        password: '511511',
        firstName: 'Eric',
        lastName: 'Admin',
        role: 'ADMIN',
    },
    {
        email: 'yoyo@printngoplus.com',
        password: 'yoyo1600',
        firstName: 'Yoyo',
        lastName: 'Admin',
        role: 'ADMIN',
    },
    {
        email: 'mia@printngoplus.com',
        password: 'mia1600',
        firstName: 'Mia',
        lastName: 'Admin',
        role: 'ADMIN',
    },
];

async function main() {
    console.log('🌱 Creating manager users (printngoplus admins)...');

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
