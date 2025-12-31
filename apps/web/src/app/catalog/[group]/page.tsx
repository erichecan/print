/**
 * Catalog Group Page - 分组商品列表页
* 支持 /catalog/[group] 路由格式，显示该分组下的所有产品
 */
import { Metadata } from 'next';
import { generateSEOMetadata } from '@/lib/seo';
import dynamic from 'next/dynamic';
import { CatalogGroupClient } from './CatalogGroupClient';

// 动态导入客户端组件
const SidebarGrouped = dynamic(
  () => import('@/components/catalog/SidebarGrouped').then((mod) => mod.SidebarGrouped),
  { ssr: false }
);

type Props = {
  params: Promise<{
    group: string;
  }>;
};

// 生成 SEO 元数据
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { group } = await params;
  const groupName = group.replace(/-/g, ' ');
  
  return generateSEOMetadata({
    title: `${groupName} - Custom Apparel & Products`,
    description: `Browse ${groupName} products. Custom designs, free shipping, satisfaction guaranteed.`,
    keywords: [groupName.toLowerCase(), 'custom apparel'],
    url: `https://suvernireplus.com/catalog/${group}`,
  });
}

export default async function CatalogGroupPage({ params }: Props) {
  const { group } = await params;

  return (
    <div className="catalog-page">
      <section className="plp-new">
        <div className="container plp-new__grid">
          {/* 左侧导航 */}
          <aside className="plp-new__sidebar">
            <SidebarGrouped
              selected={{ groupSlug: group }}
            />
          </aside>

          {/* 主内容区 */}
          <div className="plp-new__main">
            <CatalogGroupClient groupSlug={group} />
          </div>
        </div>
      </section>
    </div>
  );
}
