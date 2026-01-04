const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Searching for products containing 'test'...");
    const products = await prisma.product.findMany({
        where: {
            name: {
                contains: 'test222',
                mode: 'insensitive'
            }
        },
        include: {
            images: {
                orderBy: {
                    sortOrder: 'asc'
                }
            },
            variants: {
                orderBy: {
                    id: 'asc'
                }
            },
            category: true
        }
    });

    console.log(`Found ${products.length} products.`);
    console.log(JSON.stringify(products, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
