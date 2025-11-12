/**
 * Next.js config
 * Updated: 2025-11-04 00:00:00
 * [2025-01-27 12:00:00] Added Netlify output configuration
 */
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
  reactStrictMode: true,
  // [2025-11-10 23:55:03] 清理已默认启用的 experimental.appDir 配置，避免构建警告
  // [2025-01-27 12:00:00] 配置 Netlify 静态导出模式（适合静态托管）
  // 注意：静态导出会失去 SSR 功能，但适合 Netlify 静态托管
  output: process.env.NETLIFY === 'true' ? 'export' : undefined,
  // [2025-01-27 12:00:00] 配置图片优化（静态导出模式下需要）
  images: {
    unoptimized: process.env.NETLIFY === 'true',
  },
};

const sentryWebpackPluginOptions = {
  silent: true,
  dryRun: !process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN,
};

const sentryOptions = {
  hideSourceMaps: true,
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions, sentryOptions);


