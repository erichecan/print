/**
 * Home Page
* Migrated marketing homepage layout from prototype into Next.js
* 补充完整的 SEO 元数据和结构化数据
* Updated to use CMS content via HomeClient component
* Added mobile-specific homepage support
 */
import { generateSEOMetadata, generateWebsiteSchema, generateOrganizationSchema } from '@/lib/seo';
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
  let websiteSchemaHtml = '';
  let organizationSchemaHtml = '';

  try {
    const websiteSchema = generateWebsiteSchema();
    websiteSchemaHtml = JSON.stringify(websiteSchema);
  } catch (error) {
    console.error('[Home] Failed to generate website schema:', error);
    // 使用默认 schema
    websiteSchemaHtml = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'suvernire plus',
      url: 'https://suvernireplus.com',
    });
  }

  try {
    const organizationSchema = generateOrganizationSchema();
    organizationSchemaHtml = JSON.stringify(organizationSchema);
  } catch (error) {
    console.error('[Home] Failed to generate organization schema:', error);
    // 使用默认 schema
    organizationSchemaHtml = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'suvernire plus',
      url: 'https://suvernireplus.com',
    });
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: websiteSchemaHtml }}
/>{/* Website schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: organizationSchemaHtml }}
/>{/* Organization schema */}
      <div>
{/* 使用 HomePageWrapper 根据设备类型显示桌面端或移动端页面 */}
        <HomePageWrapper />
      </div>
    </>
  );
}