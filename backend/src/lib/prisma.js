// [2025-11-04 23:45:00] Prisma Client Singleton
const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
  prisma = global.prisma;
}

// [2025-11-18 14:45:00] Backward compatibility for renamed Variant model
if (prisma && prisma.variant && !prisma.productVariant) {
  prisma.productVariant = prisma.variant;
}

module.exports = prisma;
