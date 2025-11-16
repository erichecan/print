// [2025-11-02 20:52:00] Server entry point
require('dotenv').config();
const app = require('./src/app');
const { testConnection } = require('./src/config/database');
const logger = require('./src/utils/logger');
const { execSync } = require('child_process');

const PORT = process.env.PORT || 3000;

// [2025-11-16 16:18:00] Optionally run DB migrations before starting the server in production
const runMigrationsIfEnabled = () => {
  try {
    if (process.env.AUTO_MIGRATE === 'true') {
      logger.info('🔧 AUTO_MIGRATE=true detected. Running database migrations...');
      execSync('node scripts/run-migrations.js', { stdio: 'inherit' });
      logger.info('✅ Database migrations completed.');
    } else {
      logger.info('ℹ️  AUTO_MIGRATE not enabled. Skipping migrations.');
    }
  } catch (error) {
    logger.error('❌ Failed to run migrations:', error);
    process.exit(1);
  }
};

// Test database connection before starting server
testConnection().then(() => {
  runMigrationsIfEnabled();
  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📡 API available at http://localhost:${PORT}/api`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

