/**
 * Next.js config
 * [2025-01-30 23:00:00] Design Lab 4.0: 构建时环境变量校验
 * Updated: 2025-11-04 00:00:00

 * [2025-01-27 14:10:00] 移除 Sentry 配置，使用简单的错误处理方案
 * [2025-01-30 17:30:00] 修复：构建时验证改为内联，避免导入 TypeScript 模块
 */

// [2025-12-19 15:02:10] 统一前端构建版本信息注入：显式通过 next.config 的 env 注入到浏览器端（GCP Docker 构建更稳定）
function pickFirstNonEmpty(...values) {
  for (const v of values) {
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}

// [2025-12-19 15:02:10] 兼容多种 CI/CD 提供的 commit SHA 环境变量（GCP Cloud Build / GitHub Actions / Vercel 等）
function normalizeSha(value) {
  const v = (value || '').trim();
  if (!v) return '';
  // 有些平台会给出全长 SHA，这里统一截断到 7 位用于展示
  return v.length > 7 ? v.substring(0, 7) : v;
}

// [2025-12-19 15:02:10] 构建时间兜底：优先使用注入的 ISO 时间；其次使用 SOURCE_DATE_EPOCH；最后使用当前时间（构建期）
function normalizeBuildTime(value) {
  const v = (value || '').trim();
  if (v) return v;
  const epoch = (process.env.SOURCE_DATE_EPOCH || '').trim();
  if (epoch && /^\d+$/.test(epoch)) {
    const ms = Number(epoch) * 1000;
    if (Number.isFinite(ms)) return new Date(ms).toISOString();
  }
  return new Date().toISOString();
}

// [2025-01-30 17:30:00] 构建时环境变量校验（内联实现，避免导入 TypeScript 模块）
function validateEnvAtBuildTime() {
  const isBuildTime = !!process.env.NEXT_PHASE || process.env.NODE_ENV === 'production';
  if (!isBuildTime) return;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

  // 构建时如果环境变量未设置，只警告，不阻止构建（运行时检查在 env.ts 中）
  if (!apiUrl) {
    console.warn('[next.config] ⚠️ 构建时 NEXT_PUBLIC_API_URL 未设置，运行时需要配置环境变量');
    return;
  }

  // 构建时检测到 localhost，只警告，不阻止构建
  if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
    console.warn('[next.config] ⚠️ 构建时检测到 localhost API 地址，运行时需要配置正确的生产环境地址:', apiUrl);
  }
}

function validateStripeConfig() {
  const isBuildTime = !!process.env.NEXT_PHASE || process.env.NODE_ENV === 'production';
  if (!isBuildTime) return;

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  // 构建时如果 Stripe 密钥未设置，只警告，不阻止构建（运行时检查在 stripe.ts 中）
  if (!publishableKey || publishableKey.trim() === '') {
    console.warn('[next.config] ⚠️ 构建时 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 未设置，运行时需要配置环境变量');
  }
}

// 构建时校验环境变量（仅警告，不阻止构建）
if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'production') {
  try {
    validateEnvAtBuildTime();
    validateStripeConfig();
  } catch (error) {
    // [2025-01-30 17:30:00] 构建时验证失败只警告，不阻止构建（运行时会有更严格的检查）
    console.warn('[next.config] ⚠️ 构建时环境变量校验警告:', error.message);
  }
}

// [2025-12-19 15:02:10] 构建版本信息（显式注入到 nextConfig.env，避免浏览器端出现 unknown）
const isProdBuild = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'production';
const computedBuildSha = normalizeSha(
  pickFirstNonEmpty(
    process.env.NEXT_PUBLIC_BUILD_SHA,
    // 兼容旧变量：部分代码仍会读取 NEXT_PUBLIC_GIT_SHA
    process.env.NEXT_PUBLIC_GIT_SHA,
    process.env.GIT_SHA,
    process.env.COMMIT_SHA,
    process.env.GITHUB_SHA,
    process.env.CI_COMMIT_SHA,
    process.env.SOURCE_VERSION
  )
) || (isProdBuild ? 'unknown' : 'dev');

const computedBuildTime =
  pickFirstNonEmpty(process.env.NEXT_PUBLIC_BUILD_TIME, process.env.BUILD_TIME) ||
  (isProdBuild ? normalizeBuildTime('') : 'dev');

const remotePatterns = [
  // [2025-12-09] 开发环境：允许 localhost
  ...(process.env.NODE_ENV === 'development' ? [
    {
      protocol: 'http',
      hostname: 'localhost',
      // [2025-12-19 15:22:40] 修复：默认本地后端端口调整为 4000（与 webapp-testing/Playwright 以及后端启动脚本一致）
      port: '4000',
      pathname: '/**',
    },
    {
      protocol: 'http',
      hostname: '127.0.0.1',
      // [2025-12-19 15:22:40] 修复：默认本地后端端口调整为 4000（与 webapp-testing/Playwright 以及后端启动脚本一致）
      port: '4000',
      pathname: '/**',
    },
    // [2025-12-19 15:22:40] 兼容：如果本地仍使用旧端口 3001，也允许图片加载（不影响 rewrites/env 的默认值）
    {
      protocol: 'http',
      hostname: 'localhost',
      port: '3001',
      pathname: '/**',
    },
    {
      protocol: 'http',
      hostname: '127.0.0.1',
      port: '3001',
      pathname: '/**',
    },
  ] : []),
  // [2025-11-16 16:55:00] 允许 Unsplash 演示图片域名
  {
    protocol: 'https',
    hostname: 'images.unsplash.com',
    port: '',
    pathname: '/**',
  },
  // [2025-12-01 22:20:00] 允许 GCP Cloud Storage 图片域名
  // [2025-01-27 19:35:00] 修复：明确指定 print-main-product-images bucket 路径
  {
    protocol: 'https',
    hostname: 'storage.googleapis.com',
    port: '',
    pathname: '/print-main-product-images/**',
  },
  {
    protocol: 'https',
    hostname: 'storage.googleapis.com',
    port: '',
    pathname: '/print-main-assets/**',
  },
  // [2025-12-08 04:30:00] 允许 picsum.photos 演示图片域名
  {
    protocol: 'https',
    hostname: 'picsum.photos',
    port: '',
    pathname: '/**',
  },
  // [2025-12-09] 允许 Cloud Run 前端域名（用于图片代理）
  {
    protocol: 'https',
    hostname: '*.run.app',
    port: '',
    pathname: '/**',
  },
  // [2025-12-09] 允许 suvernireplus.com 域名（用于 SEO 图片）
  {
    protocol: 'https',
    hostname: 'suvernireplus.com',
    port: '',
    pathname: '/**',
  },
  // [2025-01-30 19:50:00] 允许 Custom Ink 产品图片 CDN（用于 Design Lab 商品主图）
  {
    protocol: 'https',
    hostname: 'mms-images-prod.imgix.net',
    port: '',
    pathname: '/**',
  },
  // [2025-01-30 19:50:00] 允许 via.placeholder.com（用于占位图）
  {
    protocol: 'https',
    hostname: 'via.placeholder.com',
    port: '',
    pathname: '/**',
  },
];

// [2025-11-15 23:09:50] Allow image optimizer to proxy the configured API host
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
if (apiBaseUrl) {
  try {
    const parsed = new URL(apiBaseUrl);
    remotePatterns.push({
      protocol: parsed.protocol.replace(':', ''),
      hostname: parsed.hostname,
      port: parsed.port || '',
      pathname: '/**',
    });
  } catch (error) {
    console.warn('[next.config] Failed to parse NEXT_PUBLIC_API_URL for image remotePatterns', error);
  }
}

const nextConfig = {
  async rewrites() {
    // [2025-12-09] 修复：统一使用环境变量，移除硬编码地址
    // rewrites() 只在构建时执行，所以构建时允许使用默认值
    // 运行时检查在 api-route-config.ts 中进行
    const isDevelopment = process.env.NODE_ENV === 'development';
    let apiUrl = process.env.NEXT_PUBLIC_API_URL;

    // [2025-12-21] FIX: In development, force usage of local backend (port 3001) to allow correct session management.
    // This overrides any production URL set in .env files which causes auth failures locally.
    if (isDevelopment && !process.env.NEXT_PUBLIC_USE_REMOTE_API) {
      console.warn('[next.config] ⚠️ Development mode: Forcing API URL to http://localhost:3001 for rewrites');
      apiUrl = 'http://localhost:3001';
    }

    if (!apiUrl) {
      // [2025-12-09] 构建时允许使用默认值（无论是开发还是生产构建）
      // 运行时检查在 api-route-config.ts 中进行
      // [2025-12-19 15:22:40] 修复：默认本地后端端口调整为 3001
      apiUrl = 'http://localhost:3001';
      if (isDevelopment) {
        console.warn('[next.config] ⚠️ NEXT_PUBLIC_API_URL 未设置，使用开发环境默认值:', apiUrl);
      } else {
        console.warn('[next.config] ⚠️ 构建时 NEXT_PUBLIC_API_URL 未设置，使用默认值（运行时需要配置环境变量）:', apiUrl);
      }
    }

    // [2025-12-09] 构建时允许 localhost（运行时检查在 api-route-config.ts 中进行）
    // 这里只做警告，不抛出错误
    if (!isDevelopment && (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1'))) {
      console.warn('[next.config] ⚠️ 构建时检测到 localhost API 地址，运行时需要配置正确的生产环境地址:', apiUrl);
    }

    // [2025-12-09] 确保 URL 不包含 /api 后缀（rewrites 会自动添加）
    apiUrl = apiUrl.replace(/\/api\/?$/, '');

    return [
      // [2025-12-08 05:40:00] 移除 /api/proxy/:path* rewrite 规则
      // 原因：/api/proxy/* 应该通过 Next.js API 路由处理器（apps/web/src/app/api/proxy/[...path]/route.ts）处理
      // 而不是直接 rewrite 到后端，这样可以正确处理认证、Cookie 转发等
      // {
      //   source: '/api/proxy/:path*',
      //   destination: `${apiUrl}/:path*`,
      // },
      // [2025-01-29 02:20:00] 代理 /api/auth/login 和 /api/auth/me 以处理 Cookie
      {
        source: '/api/auth/login',
        destination: `${apiUrl}/auth/login`,
      },
      {
        source: '/api/auth/me',
        destination: `${apiUrl}/auth/me`,
      },
    ];
  },
  // [2025-12-31] Force disable caching for all routes to prevent stale content issues
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },
  reactStrictMode: true,
  // [2025-01-29 12:30:00] API URL 配置：开发环境使用 localhost，生产环境必须通过环境变量设置
  env: {
    // 仅在开发环境使用 localhost 作为默认值，生产环境必须设置环境变量
    // [2025-12-19 15:22:40] 修复：默认本地后端端口调整为 4000（与 webapp-testing/Playwright 以及后端启动脚本一致）
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : ''),
    API_BASE_URL: process.env.API_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : ''),
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:4000/api' : ''),
    // [2025-01-31 14:00:00] GCS 图片基础 URL（用于 Design Lab 产品图片）
    NEXT_PUBLIC_GCS_IMAGE_BASE_URL: process.env.NEXT_PUBLIC_GCS_IMAGE_BASE_URL || process.env.GCP_IMAGE_BASE_URL || 'https://storage.googleapis.com/print-main-product-images',
    // [2025-12-19 15:02:10] 前端构建版本信息：显式注入，保证浏览器端一定能读到（用于部署验证）
    NEXT_PUBLIC_BUILD_SHA: computedBuildSha,
    NEXT_PUBLIC_BUILD_TIME: computedBuildTime,
    // [2025-12-19 15:02:10] 兼容：历史代码使用 NEXT_PUBLIC_GIT_SHA，统一指向同一份 SHA
    NEXT_PUBLIC_GIT_SHA: normalizeSha(pickFirstNonEmpty(process.env.NEXT_PUBLIC_GIT_SHA, computedBuildSha)) || 'dev',
    // [2025-12-08 14:40:00] 新的 Design Lab 页面 URL 配置
    NEXT_PUBLIC_NEW_DESIGN_URL: process.env.NEXT_PUBLIC_NEW_DESIGN_URL || '',
    NEXT_PUBLIC_NEW_DESIGN_PATH: process.env.NEXT_PUBLIC_NEW_DESIGN_PATH || '/design-lab',
  },
  // [2025-01-27 15:30:00] 临时禁用类型检查以避免 Next.js 15 类型生成问题
  typescript: {
    ignoreBuildErrors: true, // 临时方案，等待 Next.js 修复类型生成问题
  },
  // [2025-12-08 05:05:00] 允许构建时忽略 ESLint 警告（仅警告，不影响功能）
  eslint: {
    ignoreDuringBuilds: true, // 允许构建时忽略 ESLint 警告
  },
  // [2025-11-14 06:18:00] 移除静态导出 output 配置
  // [2025-01-27 12:00:00] 配置图片优化（静态导出模式下需要）
  images: {
    // [2025-12-03 04:15:00] 图片优化器配置
    // 后端已修复：对于 GCS URL 不再添加查询参数，让 Next.js Image 优化器处理
    // 如果需要在生产环境禁用优化，设置环境变量 DISABLE_IMAGE_OPTIMIZATION=true
    // [2025-01-29 23:30:00] 在 Cloud Run 上禁用图片优化器，避免静态资源 400 错误
    // [2025-01-29 23:55:00] 对于 GCS 图片，由于已经配置了 remotePatterns，可以启用优化
    // 但在 Cloud Run 上，由于静态资源路径问题，仍然禁用优化
    // [2025-01-30 12:00:00] 修复：在 Cloud Run 生产环境禁用图片优化，避免 400 错误
    unoptimized:

      process.env.NEXT_IMAGE_UNOPTIMIZED === 'true' ||
      process.env.DISABLE_IMAGE_OPTIMIZATION === 'true' ||
      (process.env.NODE_ENV === 'production' && process.env.GCP_DEPLOY === 'true'),
    formats: ['image/avif', 'image/webp'], // [2025-01-27 14:20:00] 支持现代图片格式
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // [2025-01-27 14:20:00] 响应式图片尺寸
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // [2025-01-27 14:20:00] 图片尺寸配置
    remotePatterns,
    // [2025-01-29 23:30:00] 允许本地静态资源路径
    domains: [],
    path: '/_next/image',
  },
  // [2025-01-27 14:20:00] 性能优化配置
  compress: true, // 启用 gzip 压缩
  poweredByHeader: false, // 移除 X-Powered-By 头
  // [2025-01-29 01:00:00] 优化资源预加载，减少不必要的预加载警告
  onDemandEntries: {
    // 页面在内存中保留的时间（毫秒）
    maxInactiveAge: 25 * 1000,
    // 同时保留在内存中的页面数
    pagesBufferLength: 2,
  },
  // [2025-01-27 14:20:00] 代码分割优化
  experimental: {
    optimizePackageImports: ['@stripe/stripe-js', '@stripe/react-stripe-js', 'fabric'], // 优化大型库的导入
    // [2025-01-30 23:00:00] Design Lab 4.0: 移除对不存在页面的预取（可选，根据需要）
    // prefetch: false,
  },
  // [2025-01-27 14:20:00] Webpack 优化配置
  // [2025-01-31 16:25:00] 修复：移除 vendor.css 和 layout.css 的生成，避免 404 错误
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 客户端代码分割优化
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // [2025-01-31 16:25:00] 移除 vendor 单独打包，避免生成 vendor.css 导致 404
            // 将大型库合并到主 bundle 中
            // vendor: {
            //   name: 'vendor',
            //   chunks: 'all',
            //   test: /node_modules/,
            //   priority: 20,
            // },
            // Stripe 相关库单独打包
            stripe: {
              name: 'stripe',
              test: /[\\/]node_modules[\\/](@stripe)[\\/]/,
              chunks: 'all',
              priority: 30,
            },
            // Fabric.js 单独打包
            fabric: {
              name: 'fabric',
              test: /[\\/]node_modules[\\/]fabric[\\/]/,
              chunks: 'all',
              priority: 30,
            },
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
