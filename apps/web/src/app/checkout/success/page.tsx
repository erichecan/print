/**
 * Checkout Success Page
* 支付成功提示页
* 添加 'use client' 指令以支持 styled-jsx
* 添加订单号复制功能，优化用户体验
 */
import { Suspense } from 'react';
import CheckoutSuccessClient from './CheckoutSuccessClient';

export default function CheckoutSuccessPage() {
// 使用 Suspense 包裹客户端组件以满足 useSearchParams 要求
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '50vh', display: 'grid', placeItems: 'center' }}>
          <p>Preparing your confirmation…</p>
        </div>
      }
    >
      <CheckoutSuccessClient />
    </Suspense>
  );
}


