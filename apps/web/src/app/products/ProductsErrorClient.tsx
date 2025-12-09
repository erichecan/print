/**
 * Products Error Client Component
 * [2025-12-09 23:50:00] 客户端错误组件，用于处理商品列表页错误
 * 修复：Server Component 不能传递函数给 Client Component 的问题
 */
'use client';

import { ErrorState } from '@/components/ErrorState';

export default function ProductsErrorClient({ error }: { error: string }) {
  const handleRetry = () => {
    // 刷新页面以重试
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <ErrorState
      error={error}
      title="无法加载商品列表"
      retryable={true}
      onRetry={handleRetry}
    />
  );
}

