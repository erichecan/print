/**
 * Home Page
* Migrated marketing homepage layout from prototype into Next.js
* 补充完整的 SEO 元数据和结构化数据
* Updated to use CMS content via HomeClient component
* Added mobile-specific homepage support
 */
import { generateSEOMetadata, generateWebsiteSchema, generateOrganizationSchema, generateLocalBusinessSchema } from '@/lib/seo';
import { DatabaseCategoriesSection } from '@/components/home/DatabaseCategoriesSection';
import { HomeClient } from '@/components/home/HomeClient';
import { HomePageWrapper } from '@/components/home/HomePageWrapper';
import type { Metadata } from 'next';

// 生成首页 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Custom Merch & Promotional Products',
  description: 'Design custom t-shirts, hoodies, and apparel online. Free shipping, satisfaction guaranteed. Professional design tools, bulk pricing available.',
  keywords: ['custom t-shirts', 'custom apparel', 'promotional products', 'bulk printing', 'custom hoodies', 'design tools'],
  url: 'https://suvernireplus.com',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

export default function Home() {
// 安全地序列化结构化数据，添加错误处理
  const websiteSchemaHtml = JSON.stringify(generateWebsiteSchema());
  const organizationSchemaHtml = JSON.stringify(generateOrganizationSchema());
  const localBusinessSchemaHtml = JSON.stringify(generateLocalBusinessSchema());

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: websiteSchemaHtml }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: organizationSchemaHtml }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: localBusinessSchemaHtml }} />
      <div>
{/* 使用 HomePageWrapper 根据设备类型显示桌面端或移动端页面 */}
        <HomePageWrapper />
      </div>
    </>
  );
}