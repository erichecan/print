/**
 * Next.js config
 * Updated: 2025-11-04 00:00:00
 */
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
  reactStrictMode: true,
  // [2025-11-10 23:55:03] 清理已默认启用的 experimental.appDir 配置，避免构建警告
};

const sentryWebpackPluginOptions = {
  silent: true,
  dryRun: !process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN,
};

const sentryOptions = {
  hideSourceMaps: true,
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions, sentryOptions);


