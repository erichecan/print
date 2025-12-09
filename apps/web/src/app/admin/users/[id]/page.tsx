import AdminUserDetailClient from './AdminUserDetailClient';

// [2025-12-09 14:30:00] 修复：Next.js 15 中 params 可能是 Promise，需要 await
export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  // [2025-12-09 14:30:00] 处理 params 可能是 Promise 的情况
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  return <AdminUserDetailClient id={resolvedParams.id} />;
}
