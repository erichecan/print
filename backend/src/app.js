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
// [2025-01-29 01:00:00] 增强 CORS 配置，确保包含所有必要的前端域名
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  'https://souvenirplus.netlify.app',
  'https://printm.netlify.app', // [2025-01-27 16:50:00] 添加生产环境前端域名
  process.env.FRONTEND_URL, // [2025-01-29 01:00:00] GCP Cloud Run 前端 URL
].filter(Boolean); // 移除 undefined 值
// [2025-11-24 11:45:00] 允许任意 localhost / 127.0.0.1 端口，避免 Next.js dev server 改用 3001/3002 导致 CORS
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

const corsOptions = {
  origin: (origin, callback) => {
    // [2025-01-29 02:00:00] 允许没有 origin 的请求（如移动应用或 Postman）
    if (!origin) return callback(null, true);
    
    // [2025-01-29 02:00:00] 检查 origin 是否在允许列表或本地域名列表中
    if (allowedOrigins.includes(origin) || localhostOriginPattern.test(origin)) {
      callback(null, true);
    } else {
      // [2025-01-29 02:00:00] 也允许所有 netlify.app 子域名（用于预览部署）
      if (origin.endsWith('.netlify.app')) {
        callback(null, true);
      } else if (origin.endsWith('.run.app')) {
        // [2025-01-27 23:00:00] 允许所有 Cloud Run 域名（用于 GCP 部署）
        // [2025-01-29 02:00:00] 记录允许的 Cloud Run 域名以便调试
        console.log(`[CORS] Allowing Cloud Run origin: ${origin}`);
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
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Cookie',
    'x-playwright-e2e', // [2025-12-01] 允许 Playwright 测试头
    'Accept',
    'Origin',
    'Referer',
    'User-Agent',
    'X-Requested-With',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
  ],
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
app.use('/uploads', express.static(path.join(__dirname, '../uploads'))); // [2025-01-28 00:55:00] Serve uploaded files including art assets
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

// Version endpoint
// [2025-12-04 16:30:15] 返回后端当前部署的构建版本（短 SHA）和构建时间，便于线上与本地版本对比
app.get('/api/version', (req, res) => {
  const version = process.env.APP_BUILD_SHA || 'unknown';
  const buildTime = process.env.APP_BUILD_TIME || null;

  res.json({
    version,
    buildTime,
    env: process.env.NODE_ENV || 'development',
  });
});

// [2025-12-07 08:15:00] 添加全局中间件，记录所有 /api/admin 请求（在路由注册之前）
app.use('/api/admin', (req, res, next) => {
  logger.info('[App] 🔵 /api/admin request received (before routing)', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    url: req.url,
    hasAuthHeader: !!req.headers.authorization,
    tokenPreview: req.headers.authorization?.substring(0, 30) || 'none',
    allHeaders: Object.keys(req.headers),
  });
  next();
});

// API routes
app.use('/api/products', require('./routes/products'));
app.use('/api/product-color-images', require('./routes/productColorImages')); // [2025-01-30 23:55:00] Product color image mapping API
app.use('/api/categories', require('./routes/categories'));
app.use('/api/content', require('./routes/content')); // [2025-01-28 06:20:00] Public CMS content API
app.use('/api/promotions', require('./routes/promotions'));
// [2025-11-28 12:50:00] 临时路由：快速创建 admin 用户（生产环境应该禁用）
app.use('/api/admin-setup', require('./routes/admin-setup')); // [2025-01-28 12:20:00] Public promotion API
app.use('/api/admin-seed', require('./routes/admin-seed')); // [2025-01-29 22:30:00] Admin seed route
app.use('/api/art-assets', require('./routes/artAssets')); // [2025-01-28 00:55:00] Art assets public API // [2025-01-27 18:50:00] Public category routes
app.use('/api/fonts', require('./routes/fonts')); // [2025-01-30 19:00:00] Fonts public API
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
// [2025-12-06] PRD v2.0: 线下订单配置数据管理路由
app.use('/api/admin/offline-order-products', require('./routes/offlineOrderProducts'));
// [2025-12-07 08:00:00] 简化的产品管理路由
app.use('/api/offline-orders/products', require('./routes/simpleOfflineOrderProducts'));
app.use('/api/admin/offline-order-colors', require('./routes/offlineOrderColors'));
app.use('/api/admin/offline-order-size-fees', require('./routes/offlineOrderSizeFees'));
app.use('/api/admin/offline-order-product-color-sizes', require('./routes/offlineOrderProductColorSizes'));
// [2025-12-02 04:48:00] Sales 线下订单查看接口（基于 OfflineOrder）
app.use('/api/sales/orders', require('./routes/salesOrders'));
app.use('/api/admin/cost-management', require('./routes/adminCostManagement')); // [2025-11-10 10:30:00] Cost management routes
app.use('/api/admin/products', require('./routes/adminProducts')); // [2025-11-11 23:20:15] Admin product management routes
// [2025-12-06 16:00:00] Inventory alerts routes - create a simple router that forwards to adminProducts
const inventoryAlertsRouter = express.Router();
inventoryAlertsRouter.use(require('./middleware/auth').requireAdmin);
inventoryAlertsRouter.get('/alerts', require('./controllers/inventoryController').getInventoryAlerts);
app.use('/api/admin/inventory', inventoryAlertsRouter);
app.use('/api/admin/categories', require('./routes/adminCategories')); // [2025-11-11 23:20:15] Admin category management routes
app.use('/api/admin/orders', require('./routes/adminOrders')); // [2025-11-12 01:05:02] Admin order management routes
app.use('/api/admin/users', require('./routes/adminUsers')); // [2025-11-15 14:05:00] Admin user management routes
app.use('/api/admin/coupons', require('./routes/adminCoupons')); // [2025-11-15 15:15:00] Admin coupon management routes
app.use('/api/admin/promotions', require('./routes/adminPromotions')); // [2025-11-15 15:20:00] Admin promotion management routes
app.use('/api/admin/suppliers', require('./routes/suppliers')); // [2025-12-06 17:10:00] Supplier management routes for Issue #89
app.use('/api/admin/settings', require('./routes/adminSettings')); // [2025-11-15 15:30:00] Admin site/content settings routes
app.use('/api/admin/content', require('./routes/adminContent')); // [2025-01-28 06:00:00] Admin CMS content management routes
app.use('/api/admin/designs', require('./routes/adminDesigns')); // [2025-11-15 15:05:00] Admin design review routes
app.use('/api/admin/art-assets', require('./routes/adminArtAssets')); // [2025-01-28 00:55:00] Admin art assets management routes
app.use('/api/admin/fonts', require('./routes/adminFonts')); // [2025-01-30 19:00:00] Admin fonts management routes
app.use('/api/admin/fix-images', require('./routes/adminFixImages')); // [2025-01-29 19:50:00] 临时：修复商品图片记录
app.use('/api/admin/analytics', require('./routes/adminAnalytics')); // [2025-12-06 21:30:00] Admin analytics routes for Issue #160
app.use('/api/designs', require('./routes/designs')); // [2025-11-11 15:33:45] Design Lab public routes
app.use('/api/designs', require('./routes/designComments')); // [2025-01-27 21:40:00] Design comment routes
app.use('/api/templates', require('./routes/templates')); // [2025-01-27 21:40:00] Design template routes
app.use('/api/comments', require('./routes/designComments')); // [2025-01-27 21:40:00] Comment actions (like)
app.use('/api/reviews', require('./routes/productReviews')); // [2025-01-27 21:45:00] Product review actions (helpful)
app.use('/api/contact', require('./routes/contact')); // [2025-01-27 19:10:00] Contact form routes
app.use('/api/coupons', require('./routes/coupons')); // [2025-01-27 19:40:00] Coupon routes
app.use('/api/payment-methods', require('./routes/paymentMethods')); // [2025-12-06 17:20:00] Payment method management routes for Issue #112
app.use('/api/chat', require('./routes/chat')); // [2025-12-07 01:30:00] Customer service chat routes for Issue #144
// app.use('/api/user', require('./routes/userRoutes'));
// app.use('/api/admin', require('./routes/adminRoutes'));

// Error handling middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;

