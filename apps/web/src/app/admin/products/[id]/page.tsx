// [2025-01-27 14:30:00] 服务器组件包装器，用于静态导出模式
import AdminProductEditClient from './AdminProductEditClient';

// [2025-01-27 14:25:00] 为静态导出模式添加 generateStaticParams
export async function generateStaticParams() {
  // 返回空数组，因为产品 ID 是动态的，无法在构建时预生成
  // 页面会在客户端运行时动态加载
  return [];
}

// [2025-12-09 14:30:00] 修复：Next.js 15 中 params 可能是 Promise，需要 await
export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  // [2025-12-09 14:30:00] 处理 params 可能是 Promise 的情况
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  return <AdminProductEditClient id={resolvedParams.id} />;
}
