/**
 * Next.js config
 * Updated: 2025-11-04 00:00:00
 * [2025-01-27 12:00:00] Added Netlify output configuration
 * [2025-01-27 14:10:00] 移除 Sentry 配置，使用简单的错误处理方案
 */

const remotePatterns = [
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
  // [2025-11-16 16:55:00] 允许 Unsplash 演示图片域名
  {
    protocol: 'https',
    hostname: 'images.unsplash.com',
    port: '',
    pathname: '/**',
  },
  // [2025-12-01 22:20:00] 允许 GCP Cloud Storage 图片域名
  {
    protocol: 'https',
    hostname: 'storage.googleapis.com',
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
  reactStrictMode: true,
  // [2025-01-29 12:30:00] API URL 配置：开发环境使用 localhost，生产环境必须通过环境变量设置
  env: {
    // 仅在开发环境使用 localhost 作为默认值，生产环境必须设置环境变量
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : ''),
    API_BASE_URL: process.env.API_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : ''),
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api' : ''),
  },
  // [2025-01-27 15:30:00] 临时禁用类型检查以避免 Next.js 15 类型生成问题
  typescript: {
    ignoreBuildErrors: true, // 临时方案，等待 Next.js 修复类型生成问题
  },
  // [2025-11-14 06:18:00] 切换 Netlify SSR 插件，移除静态导出 output 配置
  // [2025-01-27 12:00:00] 配置图片优化（静态导出模式下需要）
  images: {
    // [2025-01-29 23:30:00] 在 Cloud Run 上禁用图片优化器，避免静态资源 400 错误
    // [2025-01-29 23:55:00] 对于 GCS 图片，由于已经配置了 remotePatterns，可以启用优化
    // 但在 Cloud Run 上，由于静态资源路径问题，仍然禁用优化
    unoptimized:
      process.env.NETLIFY === 'true' ||
      process.env.NEXT_IMAGE_UNOPTIMIZED === 'true' ||
      process.env.DISABLE_IMAGE_OPTIMIZATION === 'true',
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
  },
  // [2025-01-27 14:20:00] Webpack 优化配置
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
            // 将大型库单独打包
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
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
