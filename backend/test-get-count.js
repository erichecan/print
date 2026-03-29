require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.offline_order_products.count().then(console.log).finally(() => prisma.$disconnect());
