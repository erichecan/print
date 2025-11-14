// [2025-01-27 14:30:00] 服务器组件包装器，用于静态导出模式
import AdminCategoryEditClient from './AdminCategoryEditClient';

// [2025-01-27 14:25:00] 为静态导出模式添加 generateStaticParams
export async function generateStaticParams() {
  // 返回空数组，因为分类 ID 是动态的，无法在构建时预生成
  // 页面会在客户端运行时动态加载
  return [];
}

export default function AdminCategoryEditPage({
  params,
}: {
  params: { id: string };
}) {
  return <AdminCategoryEditClient id={params.id} />;
}
