import AdminDesignDetailClient from './AdminDesignDetailClient';

export async function generateStaticParams() {
  return [];
}

// 修复：Next.js 15 中 params 可能是 Promise，需要 await
export default async function AdminDesignReviewPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
// 处理 params 可能是 Promise 的情况
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  return <AdminDesignDetailClient id={resolvedParams.id} />;
}
