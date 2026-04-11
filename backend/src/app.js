// Express application setup
// Added cookie-parser for session management
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

const prototypeRoot = path.join(__dirname, '../prototype'); // Centralize legacy prototype path

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// CORS configuration - MUST be before Helmet
// 支持多个前端域名（本地开发 + Netlify 部署）
// 修复 CORS 配置，确保正确处理所有请求
// CORS 必须在 Helmet 之前，确保 CORS 头不被覆盖
// 添加 printm.netlify.app 到允许列表
// 增强 CORS 配置，确保包含所有必要的前端域名
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  'https://souvenirplus.netlify.app',
  'https://printm.netlify.app', // 添加生产环境前端域名
  'https://printngoplus.com', // 生产环境主域名
  'https://www.printngoplus.com', // 生产环境 www 域名
  'https://print-main-frontend-5spbppmmza-uc.a.run.app', // Cloud Run Frontend
  process.env.FRONTEND_URL, // GCP Cloud Run 前端 URL
].filter(Boolean); // 移除 undefined 值
// 允许任意 localhost / 127.0.0.1 端口，避免 Next.js dev server 改用 3001/3002 导致 CORS
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

const corsOptions = {
  origin: (origin, callback) => {
    // 允许没有 origin 的请求（如移动应用或 Postman）
    if (!origin) return callback(null, true);

    // 检查 origin 是否在允许列表或本地域名列表中
    if (allowedOrigins.includes(origin) || localhostOriginPattern.test(origin)) {
      callback(null, true);
    } else {
      // 也允许所有 netlify.app 子域名（用于预览部署）
      if (origin.endsWith('.netlify.app')) {
        callback(null, true);
      } else if (origin.endsWith('.run.app')) {
        // 允许所有 Cloud Run 域名（用于 GCP 部署）
        // 记录允许的 Cloud Run 域名以便调试
        console.log(`[CORS] Allowing Cloud Run origin: ${origin}`);
        callback(null, true);
      } else {
        // 记录被拒绝的 origin 以便调试
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
    'x-playwright-e2e', // 允许 Playwright 测试头
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

// 确保 OPTIONS 请求被正确处理
app.options('*', cors(corsOptions));

// Security middleware - AFTER CORS
// 配置 Helmet 以配合 CORS，允许跨域请求
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
app.use('/uploads', express.static(path.join(__dirname, '../uploads'))); // Serve uploaded files including art assets
app.use('/prototype/admin', express.static(path.join(prototypeRoot, 'admin'))); // Serve archived admin UI under prototype namespace
app.use('/prototype/static', express.static(path.join(prototypeRoot, 'static-pages'))); // Serve archived static pages separately
app.use('/assets', express.static(path.join(__dirname, '../assets'))); // Expose shared assets without legacy HTML

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

// Health check handler (/health and /api/health)
// Returns 200 OK always to Cloud Run, but provides status details in the body.
const healthCheckHandler = (req, res) => {
  const isStarting = req.app.get('isStarting');
  const migrationError = req.app.get('migrationError');
  const jwtSecretError = process.env.JWT_SECRET_ERROR;
  
  const status = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    bootstrapping: !!isStarting,
    checks: {
      server: 'up',
      jwt_secret: jwtSecretError ? 'error' : 'ok',
      database: migrationError ? 'error' : (isStarting ? 'connecting' : 'ok'),
      redis: 'not_configured'
    }
  };

  try {
    // Optional Redis check if available
    const { redis } = require('./config/redis');
    if (redis && redis.status === 'ready') {
      status.checks.redis = 'connected';
    }
  } catch (err) {
    // Ignore redis error here, just report status
  }

  if (jwtSecretError || migrationError) {
    status.status = 'degraded';
    status.message = `Configuration notice: ${jwtSecretError || ''} ${migrationError || ''}`.trim();
  }

  return res.status(200).json(status);
};

app.get('/health', healthCheckHandler);
app.get('/api/health', healthCheckHandler);

// Version endpoint
// 返回后端当前部署的构建版本（短 SHA）和构建时间，便于线上与本地版本对比
app.get('/api/version', (req, res) => {
  const version = process.env.APP_BUILD_SHA || 'unknown';
  const buildTime = process.env.APP_BUILD_TIME || null;

  res.json({
    version,
    buildTime,
    env: process.env.NODE_ENV || 'development',
  });
});

// 添加全局中间件，记录所有 /api/admin 请求（在路由注册之前）
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
app.use('/api/product-color-images', require('./routes/productColorImages')); // Product color image mapping API
app.use('/api/categories', require('./routes/categories'));
app.use('/api/content', require('./routes/content')); // Public CMS content API
app.use('/api/promotions', require('./routes/promotions'));
// 临时路由：快速创建 admin 用户（生产环境应该禁用）
app.use('/api/admin-setup', require('./routes/admin-setup')); // Public promotion API
app.use('/api/admin-seed', require('./routes/admin-seed')); // Admin seed route
app.use('/api/art-assets', require('./routes/artAssets')); // Art assets public API // Public category routes
app.use('/api/artworks', require('./routes/artworks')); // Artworks API with categories tree and pagination
app.use('/api/fonts', require('./routes/fonts')); // Fonts public API
app.use('/api/collections', require('./routes/collections'));
app.use('/api/brands', require('./routes/brands')); // Brands API
app.use('/api/cart', require('./routes/cart'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/addresses', require('./routes/addresses')); // User address management routes
app.use('/api/user/preferences', require('./routes/userPreferences')); // User preferences routes
app.use('/api/user/designs', require('./routes/userDesigns')); // User designs routes
// 简化的产品管理路由（必须在 /api/offline-orders 之前，避免路由冲突）
// 重构：使用统一的产品管理路由
// 添加日志确认路由加载
const offlineOrderProductsPublicRouter = require('./routes/offlineOrderProductsPublic');
logger.info('[App] Loading route: /api/offline-orders/products');
app.use('/api/offline-orders/products', offlineOrderProductsPublicRouter);
app.use('/api/offline-orders', require('./routes/offlineOrders'));
app.use('/api/admin/offline-orders', require('./routes/adminOfflineOrders'));
// PRD v2.0: 线下订单配置数据管理路由
app.use('/api/admin/offline-order-products', require('./routes/offlineOrderProducts'));
app.use('/api/admin/offline-order-colors', require('./routes/offlineOrderColors'));
app.use('/api/admin/offline-order-size-fees', require('./routes/offlineOrderSizeFees'));
app.use('/api/size-fees', require('./routes/sizeFees')); // Public size fees API for Design Lab
app.use('/api/admin/offline-order-product-color-sizes', require('./routes/offlineOrderProductColorSizes'));
// Sales 线下订单查看接口（基于 OfflineOrder）
app.use('/api/sales/orders', require('./routes/salesOrders'));
app.use('/api/admin/cost-management', require('./routes/adminCostManagement')); // Cost management routes
app.use('/api/admin/products', require('./routes/adminProducts')); // Admin product management routes
// Inventory alerts routes - create a simple router that forwards to adminProducts
const inventoryAlertsRouter = express.Router();
inventoryAlertsRouter.use(require('./middleware/auth').requireAdmin);
inventoryAlertsRouter.get('/alerts', require('./controllers/inventoryController').getInventoryAlerts);
app.use('/api/admin/inventory', inventoryAlertsRouter);
app.use('/api/admin/categories', require('./routes/adminCategories')); // Admin category management routes
app.use('/api/admin/orders', require('./routes/adminOrders')); // Admin order management routes
app.use('/api/admin/all-orders', require('./routes/unifiedOrders')); // Unified order management routes (online + offline)
app.use('/api/admin/users', require('./routes/adminUsers')); // Admin user management routes
app.use('/api/admin/coupons', require('./routes/adminCoupons')); // Admin coupon management routes
app.use('/api/admin/promotions', require('./routes/adminPromotions')); // Admin promotion management routes
app.use('/api/admin/suppliers', require('./routes/suppliers')); // Supplier management routes for Issue #89
app.use('/api/admin/settings', require('./routes/adminSettings')); // Admin site/content settings routes
app.use('/api/admin/content', require('./routes/adminContent')); // Admin CMS content management routes
app.use('/api/admin/designs', require('./routes/adminDesigns')); // Admin design review routes
app.use('/api/admin/art-assets', require('./routes/adminArtAssets')); // Admin art assets management routes
app.use('/api/admin/fonts', require('./routes/adminFonts')); // Admin fonts management routes
app.use('/api/admin/shipping-templates', require('./routes/adminShippingTemplates')); // Admin shipping templates management routes
app.use('/api/admin/fix-images', require('./routes/adminFixImages')); // 临时：修复商品图片记录
app.use('/api/admin/analytics', require('./routes/adminAnalytics')); // Admin analytics routes for Issue #160
app.use('/api/admin/sql', require('./routes/adminSql')); // Read-only SQL preview API (admin only)
app.use('/api/designs', require('./routes/designs')); // Design Lab public routes
app.use('/api/designs', require('./routes/designComments')); // Design comment routes
app.use('/api/templates', require('./routes/templates')); // Design template routes
app.use('/api/comments', require('./routes/designComments')); // Comment actions (like)
app.use('/api/reviews', require('./routes/productReviews')); // Product review actions (helpful)
app.use('/api/contact', require('./routes/contact')); // Contact form routes
app.use('/api', require('./routes/guestMessages')); // Guest messages routes (留言本)
app.use('/api/testimonials', require('./routes/testimonialRoutes')); // Testimonial routes
app.use('/api/coupons', require('./routes/coupons')); // Coupon routes
app.use('/api/payment-methods', require('./routes/paymentMethods')); // Payment method management routes for Issue #112
app.use('/api/chat', require('./routes/chat')); // Customer service chat routes for Issue #144
app.use('/api/design-lab/analytics', require('./routes/designLabAnalytics')); // Design Lab analytics routes
// app.use('/api/user', require('./routes/userRoutes'));
// app.use('/api/admin', require('./routes/adminRoutes'));

// Vapi AI Tools Routes
app.use('/api/vapi', require('./vapi/index'));

// Error handling middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;

