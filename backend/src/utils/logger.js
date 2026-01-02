// Winston logger configuration
const winston = require('winston');
const path = require('path');

const logDir = 'logs';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json({
    replacer: (key, value) => {
      // Handle Google Cloud Logging trace if traceId is present
      if (key === 'traceId' && value) {
        // This will be processed by the Google Cloud Logging agent
        return value;
      }
      return value;
    }
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, traceId, ...meta }) => {
    let msg = `${timestamp} [${level}]${traceId ? ` [${traceId}]` : ''}: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'suvernire-plus-api' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Combined logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Console transport for development
// Console transport
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat
    })
  );
} else {
  // In production, log to console in JSON format for Cloud Run
  logger.add(
    new winston.transports.Console({
      format: logFormat
    })
  );
}

module.exports = logger;

