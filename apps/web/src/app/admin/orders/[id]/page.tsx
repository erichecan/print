// 服务器组件包装器，用于静态导出模式
// 修复 Next.js 14 的异步 params 问题
import AdminOrderDetailClient from './AdminOrderDetailClient';

// 为静态导出模式添加 generateStaticParams
export async function generateStaticParams() {
  // 返回空数组，因为订单 ID 是动态的，无法在构建时预生成
  // 页面会在客户端运行时动态加载
  return [];
}

// 修复：Next.js 15 中 params 可能是 Promise，需要 await
export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
// 处理 params 可能是 Promise 的情况
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  return <AdminOrderDetailClient id={resolvedParams.id} />;
}
