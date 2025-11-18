// [2025-11-02 20:52:00] Express application setup
// [2025-11-04 23:56:00] Added cookie-parser for session management
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const logger = require('./utils/logger');
const { RATE_LIMIT } = require('./utils/constants');

const app = express();

const prototypeRoot = path.join(__dirname, '../prototype'); // [2025-11-11 22:05:10] Centralize legacy prototype path

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// CORS configuration - MUST be before Helmet
// [2025-11-15 11:10:00] 支持多个前端域名（本地开发 + Netlify 部署）
// [2025-11-15 12:05:00] 修复 CORS 配置，确保正确处理所有请求
// [2025-11-15 12:15:00] CORS 必须在 Helmet 之前，确保 CORS 头不被覆盖
// [2025-01-27 16:50:00] 添加 printm.netlify.app 到允许列表
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  'https://souvenirplus.netlify.app',
  'https://printm.netlify.app', // [2025-01-27 16:50:00] 添加生产环境前端域名
  process.env.FRONTEND_URL,
].filter(Boolean); // 移除 undefined 值

const corsOptions = {
  origin: (origin, callback) => {
    // 允许没有 origin 的请求（如移动应用或 Postman）
    if (!origin) return callback(null, true);
    
    // 检查 origin 是否在允许列表中
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // 也允许所有 netlify.app 子域名（用于预览部署）
      if (origin.endsWith('.netlify.app')) {
        callback(null, true);
      } else {
        // [2025-11-15 12:05:00] 记录被拒绝的 origin 以便调试
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Set-Cookie'],
  preflightContinue: false,
};
app.use(cors(corsOptions));

// [2025-11-15 12:05:00] 确保 OPTIONS 请求被正确处理
app.options('*', cors(corsOptions));

// Security middleware - AFTER CORS
// [2025-11-15 12:15:00] 配置 Helmet 以配合 CORS，允许跨域请求
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false, // 允许嵌入资源
  contentSecurityPolicy: false, // 暂时禁用 CSP，避免与 CORS 冲突
}));

// Cookie parser (for session and auth cookies)
app.use(cookieParser());

// Body parsing middleware
// Webhook routes need raw body, so we skip JSON parsing for them
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/prototype/admin', express.static(path.join(prototypeRoot, 'admin'))); // [2025-11-11 22:05:10] Serve archived admin UI under prototype namespace
app.use('/prototype/static', express.static(path.join(prototypeRoot, 'static-pages'))); // [2025-11-11 22:05:10] Serve archived static pages separately
app.use('/assets', express.static(path.join(__dirname, '../assets'))); // [2025-11-11 22:07:22] Expose shared assets without legacy HTML

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
// [2025-11-15 10:55:00] 增强健康检查，包含数据库连接状态
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {}
  };

  // 检查数据库连接
  try {
    const prisma = require('./lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = 'connected';
  } catch (error) {
    health.services.database = 'disconnected';
    health.status = 'degraded';
  }

  // 检查 Redis（可选）
  try {
    const { redis } = require('./config/redis');
    if (redis && redis.status === 'ready') {
      health.services.redis = 'connected';
    } else {
      health.services.redis = 'not_configured';
    }
  } catch (error) {
    health.services.redis = 'error';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// API routes
app.use('/api/products', require('./routes/products'));
app.use('/api/collections', require('./routes/collections'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/addresses', require('./routes/addresses')); // [2025-01-27 14:00:00] User address management routes
app.use('/api/user/preferences', require('./routes/userPreferences')); // [2025-01-27 14:45:00] User preferences routes
app.use('/api/offline-orders', require('./routes/offlineOrders'));
app.use('/api/admin/offline-orders', require('./routes/adminOfflineOrders'));
app.use('/api/admin/cost-management', require('./routes/adminCostManagement')); // [2025-11-10 10:30:00] Cost management routes
app.use('/api/admin/products', require('./routes/adminProducts')); // [2025-11-11 23:20:15] Admin product management routes
app.use('/api/admin/categories', require('./routes/adminCategories')); // [2025-11-11 23:20:15] Admin category management routes
app.use('/api/admin/orders', require('./routes/adminOrders')); // [2025-11-12 01:05:02] Admin order management routes
app.use('/api/admin/users', require('./routes/adminUsers')); // [2025-11-15 14:05:00] Admin user management routes
app.use('/api/admin/coupons', require('./routes/adminCoupons')); // [2025-11-15 15:15:00] Admin coupon management routes
app.use('/api/admin/promotions', require('./routes/adminPromotions')); // [2025-11-15 15:20:00] Admin promotion management routes
app.use('/api/admin/settings', require('./routes/adminSettings')); // [2025-11-15 15:30:00] Admin site/content settings routes
app.use('/api/admin/designs', require('./routes/adminDesigns')); // [2025-11-15 15:05:00] Admin design review routes
app.use('/api/designs', require('./routes/designs')); // [2025-11-11 15:33:45] Design Lab public routes
app.use('/api/designs', require('./routes/designComments')); // [2025-01-27 21:40:00] Design comment routes
app.use('/api/templates', require('./routes/templates')); // [2025-01-27 21:40:00] Design template routes
app.use('/api/comments', require('./routes/designComments')); // [2025-01-27 21:40:00] Comment actions (like)
app.use('/api/reviews', require('./routes/productReviews')); // [2025-01-27 21:45:00] Product review actions (helpful)
app.use('/api/contact', require('./routes/contact')); // [2025-01-27 19:10:00] Contact form routes
app.use('/api/coupons', require('./routes/coupons')); // [2025-01-27 19:40:00] Coupon routes
// app.use('/api/user', require('./routes/userRoutes'));
// app.use('/api/admin', require('./routes/adminRoutes'));

// Error handling middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;

