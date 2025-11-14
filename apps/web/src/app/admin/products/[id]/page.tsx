// [2025-01-27 14:30:00] 服务器组件包装器，用于静态导出模式
import AdminProductEditClient from './AdminProductEditClient';

// [2025-01-27 14:25:00] 为静态导出模式添加 generateStaticParams
export async function generateStaticParams() {
  // 返回空数组，因为产品 ID 是动态的，无法在构建时预生成
  // 页面会在客户端运行时动态加载
  return [];
}

export default function AdminProductEditPage({
  params,
}: {
  params: { id: string }>;
}) {
  // [2025-01-27 15:15:00] Next.js 15: params 现在是异步的
  const { id } = // params 已同步
  return <AdminProductEditClient id={id} />;
}
