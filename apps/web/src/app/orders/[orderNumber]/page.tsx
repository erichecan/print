// 服务器组件包装器，用于静态导出模式
// 移除 Suspense，简化结构以避免 Next.js 解析问题
// 修复 Next.js 14 的异步 params 问题
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
  return <OrderDetailContent orderNumber={resolvedParams.orderNumber} />;
}
