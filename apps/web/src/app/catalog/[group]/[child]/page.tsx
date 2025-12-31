/**
 * Catalog Category Page - 分类商品列表页
* 支持 /catalog/[group]/[child] 路由格式
 */
import { Metadata } from 'next';
import { generateSEOMetadata } from '@/lib/seo';
import dynamic from 'next/dynamic';
import { CatalogCategoryClient } from './CatalogCategoryClient';

// 动态导入客户端组件
const SidebarGrouped = dynamic(
  () => import('@/components/catalog/SidebarGrouped').then((mod) => mod.SidebarGrouped),
  { ssr: false }
);

type Props = {
  params: Promise<{
    group: string;
    child: string;
  }>;
};

// 生成 SEO 元数据
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { group, child } = await params;
  const categoryName = child.replace(/-/g, ' ');
  
  return generateSEOMetadata({
    title: `${categoryName} - Custom Apparel & Products`,
    description: `Browse ${categoryName} products. Custom designs, free shipping, satisfaction guaranteed.`,
    keywords: [categoryName.toLowerCase(), 'custom apparel', group.toLowerCase()],
    url: `https://suvernireplus.com/catalog/${group}/${child}`,
  });
}

export default async function CatalogCategoryPage({ params }: Props) {
  const { group, child } = await params;

  return (
    <div className="catalog-page">
      <section className="plp-new">
        <div className="container plp-new__grid">
          {/* 左侧导航 */}
          <aside className="plp-new__sidebar">
            <SidebarGrouped
              selected={{ groupSlug: group, childSlug: child }}
            />
          </aside>

          {/* 主内容区 */}
          <div className="plp-new__main">
            <CatalogCategoryClient groupSlug={group} childSlug={child} />
          </div>
        </div>
      </section>
    </div>
  );
}
