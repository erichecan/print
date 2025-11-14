// [2025-01-27 14:30:00] 服务器组件包装器，用于静态导出模式
// [2025-01-27 14:55:00] 移除 Suspense，简化结构以避免 Next.js 解析问题
// [2025-01-27 15:00:00] 添加 params 参数以满足 Next.js 静态导出要求
import { ProductDetailContent } from './ProductDetailContent';

// [2025-01-27 14:25:00] 为静态导出模式添加 generateStaticParams
export async function generateStaticParams() {
  // 返回空数组，因为产品 slug 是动态的，无法在构建时预生成
  // 页面会在客户端运行时动态加载
  return [];
}

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  // [2025-11-14 05:48:45] Next.js 14: params 同步，仅用于满足静态导出要求
  // 实际 slug 仍由 ProductDetailContent 内部通过 useParams() 解析
  void params; // [2025-11-14 05:48:45] 明确使用以避免未使用警告
  return <ProductDetailContent />;
}
