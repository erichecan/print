/**
 * Checkout Failure Page
* 支付失败提示页
* 添加 'use client' 指令以支持 styled-jsx
* 添加重试支付选项，优化错误信息展示
 */
import { Suspense } from 'react';
import CheckoutFailureClient from './CheckoutFailureClient';

export default function CheckoutFailurePage() {
// 使用 Suspense 包裹客户端组件提升 useSearchParams 兼容性
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


