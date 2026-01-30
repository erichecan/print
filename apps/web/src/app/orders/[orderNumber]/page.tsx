// 服务器组件包装器，用于静态导出模式
// [2026-01-27] 修复：必须使用 Suspense 包裹使用 useSearchParams 的组件
// 否则会导致 "Bail out to client-side rendering: useSearchParams()" 错误（500）
// 修复 Next.js 14/15 的异步 params 问题
import { Suspense } from 'react';
import { OrderDetailContent } from './OrderDetailContent';

// 为静态导出模式添加 generateStaticParams
export async function generateStaticParams() {
  // 返回空数组，因为订单号是动态的，无法在构建时预生成
  // 页面会在客户端运行时动态加载
  return [];
}

// 修复：Next.js 15 中 params 可能是 Promise，需要 await
export default async function OrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> | { orderNumber: string } }) {
  // 处理 params 可能是 Promise 的情况
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  // 使用 Suspense 包裹使用 useSearchParams 的客户端组件，避免 SSR 错误
  return (
    <Suspense fallback={<div className="container" style={{ padding: '2rem', textAlign: 'center' }}>Loading order details...</div>}>
      <OrderDetailContent orderNumber={resolvedParams.orderNumber} />
    </Suspense>
  );
}
