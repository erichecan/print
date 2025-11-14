// [2025-01-27 14:30:00] 服务器组件包装器，用于静态导出模式
import { Suspense } from 'react';
import { ProductDetailContent } from './ProductDetailContent';

// [2025-01-27 14:25:00] 为静态导出模式添加 generateStaticParams
export async function generateStaticParams() {
  // 返回空数组，因为产品 slug 是动态的，无法在构建时预生成
  // 页面会在客户端运行时动态加载
  return [];
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<div className="container"><p>Loading...</p></div>}>
      <ProductDetailContent />
    </Suspense>
  );
}
