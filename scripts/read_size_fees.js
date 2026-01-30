
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Reading Size Fees...");
    try {
        const sizeFees = await prisma.offline_order_size_fees.findMany({
            orderBy: {
                display_order: 'asc'
            }
        });

        console.log(`Found ${sizeFees.length} size fees:`);
        console.table(sizeFees.map(sf => ({
            id: sf.id,
            size: sf.size,
            type: sf.size_type,
            fee: sf.additional_fee,
            active: sf.is_active,
            order: sf.display_order
        })));
    } catch (e) {
        console.error("Error reading size fees:", e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
