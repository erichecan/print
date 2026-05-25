import { Metadata } from 'next';
import { generateSEOMetadata } from '@/lib/seo';
import { Suspense } from 'react';
import { CatalogGroupClient } from './CatalogGroupClient';
import { GARMENT_SLUG_TO_TAG } from '@/lib/tag-taxonomy';

type Props = {
  params: Promise<{ group: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { group } = await params;
  const groupName = GARMENT_SLUG_TO_TAG[group] ?? group.replace(/-/g, ' ');

  return generateSEOMetadata({
    title: `${groupName}s - Custom Apparel`,
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
        <div className="container plp-new__outer">
          <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center' }}>Loading...</div>}>
            <CatalogGroupClient groupSlug={group} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
