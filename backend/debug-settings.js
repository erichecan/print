
const prisma = require('./src/lib/prisma');

async function listSettings() {
    try {
        const settings = await prisma.settings.findMany({
            select: { key: true }
        });
        console.log('Available setting keys:', settings.map(s => s.key));
    } catch (error) {
        console.error('Error listing settings:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listSettings();
