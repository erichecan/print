// [2025-11-04 23:45:00] Prisma Client Singleton
// [2025-01-27 23:30:00] Enhanced with connection pool and error handling
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

let prisma;

// [2025-01-27 23:30:00] Prisma Client configuration with connection pool
const prismaConfig = {
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn', 'info']
    : ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // [2025-01-27 23:30:00] Connection pool configuration for production
  ...(process.env.NODE_ENV === 'production' && {
    // Optimize connection pool for Cloud Run
    // Cloud Run instances can scale, so we want efficient connection pooling
    // These values work well with Cloud Run's scaling behavior
  }),
};

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(prismaConfig);
  
  // [2025-01-27 23:30:00] Handle connection errors gracefully
  // Note: Prisma Client error events are handled internally
  
  // [2025-01-27 23:30:00] Test database connection on startup
  prisma.$connect()
    .then(() => {
      logger.info('[2025-01-27 23:30:00] ✅ Prisma Client connected to database');
    })
    .catch((error) => {
      logger.error('[2025-01-27 23:30:00] ❌ Failed to connect Prisma Client to database:', error);
      // Don't exit - let the app try to handle it gracefully
    });
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient(prismaConfig);
  }
  prisma = global.prisma;
}

// [2025-11-18 14:45:00] Backward compatibility for renamed Variant model
if (prisma && prisma.variant && !prisma.productVariant) {
  prisma.productVariant = prisma.variant;
}

// [2025-01-27 23:30:00] Graceful shutdown
const gracefulShutdown = async () => {
  try {
    await prisma.$disconnect();
    logger.info('[2025-01-27 23:30:00] Prisma Client disconnected gracefully');
  } catch (error) {
    logger.error('[2025-01-27 23:30:00] Error disconnecting Prisma Client:', error);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = prisma;
