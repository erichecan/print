// [2025-11-02 20:52:00] Express application setup
// [2025-11-04 23:56:00] Added cookie-parser for session management
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');
const { RATE_LIMIT } = require('./utils/constants');

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Cookie parser (for session and auth cookies)
app.use(cookieParser());

// Body parsing middleware
// Webhook routes need raw body, so we skip JSON parsing for them
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/products', require('./routes/products'));
app.use('/api/collections', require('./routes/collections'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/designs', require('./routes/designRoutes'));
// app.use('/api/user', require('./routes/userRoutes'));
// app.use('/api/admin', require('./routes/adminRoutes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: 'Route not found',
    path: req.path
  });
});

// Error handler (will be enhanced later)
app.use((err, req, res, next) => {
  logger.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;

