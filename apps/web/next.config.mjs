/**
 * Next.js config
 * Updated: 2025-11-04 00:00:00
 * [2025-01-27 12:00:00] Added Netlify output configuration
 * [2025-01-27 14:10:00] 移除 Sentry 配置，使用简单的错误处理方案
 */

const nextConfig = {
  reactStrictMode: true,
  // [2025-01-27 15:30:00] 临时禁用类型检查以避免 Next.js 15 类型生成问题
  typescript: {
    ignoreBuildErrors: true, // 临时方案，等待 Next.js 修复类型生成问题
  },
  // [2025-11-10 23:55:03] 清理已默认启用的 experimental.appDir 配置，避免构建警告
  // [2025-01-27 12:00:00] 配置 Netlify 静态导出模式（适合静态托管）
  // 注意：静态导出会失去 SSR 功能，但适合 Netlify 静态托管
  output: process.env.NETLIFY === 'true' ? 'export' : undefined,
  // [2025-01-27 12:00:00] 配置图片优化（静态导出模式下需要）
  images: {
    unoptimized: process.env.NETLIFY === 'true',
    formats: ['image/avif', 'image/webp'], // [2025-01-27 14:20:00] 支持现代图片格式
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // [2025-01-27 14:20:00] 响应式图片尺寸
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // [2025-01-27 14:20:00] 图片尺寸配置
  },
  // [2025-01-27 14:20:00] 性能优化配置
  compress: true, // 启用 gzip 压缩
  poweredByHeader: false, // 移除 X-Powered-By 头
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


