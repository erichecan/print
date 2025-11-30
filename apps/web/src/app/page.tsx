/**
 * Home Page
 * [2025-11-11 23:58:10] Migrated marketing homepage layout from prototype into Next.js
 * [2025-01-27 16:40:00] 补充完整的 SEO 元数据和结构化数据
 * [2025-01-28 06:35:00] Updated to use CMS content via HomeClient component
 * [2025-01-29 04:00:00] Added mobile-specific homepage support
 */
import { generateSEOMetadata, generateWebsiteSchema, generateOrganizationSchema } from '@/lib/seo';
import { DatabaseCategoriesSection } from '@/components/home/DatabaseCategoriesSection';
import { HomeClient } from '@/components/home/HomeClient';
import { HomePageWrapper } from '@/components/home/HomePageWrapper';
import type { Metadata } from 'next';

// [2025-01-27 16:40:00] 生成首页 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Custom Merch & Promotional Products',
  description: 'Design custom t-shirts, hoodies, and apparel online. Free shipping, satisfaction guaranteed. Professional design tools, bulk pricing available.',
  keywords: ['custom t-shirts', 'custom apparel', 'promotional products', 'bulk printing', 'custom hoodies', 'design tools'],
  url: 'https://suvernireplus.com',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

export default function Home() {
  const websiteSchema = generateWebsiteSchema();
  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />{/* [2025-11-16 11:55:00] Website schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />{/* [2025-11-16 11:55:00] Organization schema */}
      <div>
        {/* [2025-01-29 04:00:00] 使用 HomePageWrapper 根据设备类型显示桌面端或移动端页面 */}
        <HomePageWrapper />

        {/* [2025-11-19 08:35:00] 数据库驱动的分类板块，使用数据库中的分类数据，桌面端一行显示4个 */}
        {/* [2025-01-29 04:00:00] 移动端不显示此部分，已在移动端组件中包含分类 */}
        <div className="desktop-only">
          <DatabaseCategoriesSection />
        </div>
      </div>
    </>
  );
}