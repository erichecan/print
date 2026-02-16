const { PrismaClient } = require('@prisma/client');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../backend/.env');
console.log('Loading env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env:', result.error);
}

console.log('DATABASE_URL loaded:', process.env.DATABASE_URL ? 'YES' : 'NO');

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Fetching offline order products...');
        const products = await prisma.offline_order_products.findMany({
            where: {
                is_active: true,
            },
            select: {
                id: true,
                name: true,
                display_order: true,
            },
            orderBy: [
                { display_order: 'asc' },
                { name: 'asc' },
            ],
        });

        console.log(`Found ${products.length} active products.`);
        console.log('--------------------------------------------------');
        products.forEach(p => {
            console.log(`[${p.id}] ${p.name}`);
        });
        console.log('--------------------------------------------------');

    } catch (error) {
        console.error('Error fetching products:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
