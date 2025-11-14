// [2025-01-27 14:30:00] 服务器组件包装器，用于静态导出模式
// [2025-01-27 15:45:00] 修复 Next.js 14 的异步 params 问题
import AdminOrderDetailClient from './AdminOrderDetailClient';

// [2025-01-27 14:25:00] 为静态导出模式添加 generateStaticParams
export async function generateStaticParams() {
  // 返回空数组，因为订单 ID 是动态的，无法在构建时预生成
  // 页面会在客户端运行时动态加载
  return [];
}

export default function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // [2025-01-27 15:45:00] Next.js 14: params 是同步的
  return <AdminOrderDetailClient id={params.id} />;
}
