/**
 * Checkout Failure Page
 * [2025-11-12 00:45:10] 支付失败提示页
 * [2025-11-12 06:19:54] 添加 'use client' 指令以支持 styled-jsx
 * [2025-01-27 10:40:00] 添加重试支付选项，优化错误信息展示
 */
import { Suspense } from 'react';
import CheckoutFailureClient from './CheckoutFailureClient';

export default function CheckoutFailurePage() {
  // [2025-11-14 06:06:35] 使用 Suspense 包裹客户端组件提升 useSearchParams 兼容性
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '50vh', display: 'grid', placeItems: 'center' }}>
          <p>Loading checkout status…</p>
        </div>
      }
    >
      <CheckoutFailureClient />
    </Suspense>
  );
}


