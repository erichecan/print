import { Suspense } from 'react';
import { apiGet } from '@/lib/apiClient';
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { PLPLayoutClient } from './PLPLayoutClient';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Browse All Products - Custom T-Shirts, Hoodies & More',
  description: 'Browse our full catalog of custom t-shirts, hoodies, apparel, and promotional products. Filter by category, price, and brand. Free shipping available.',
  keywords: ['custom t-shirts', 'custom hoodies', 'apparel', 'promotional products', 'custom merchandise', 'bulk orders'],
  url: 'https://suvernireplus.com/products',
  image: 'https://suvernireplus.com/assets/hero/hero-card-tee.jpg',
});

type Collection = {
  id: string;
  name: string;
  slug: string;
};

async function fetchCollections(): Promise<Collection[]> {
  try {
    const response = await apiGet<Collection[]>('/collections', {}, { timeout: 8000 });
    return response;
  } catch (error) {
    console.warn('[Products Page] Failed to fetch collections:', error);
    return [];
  }
}

function normalizeSearchParams(
  params: Record<string, string | string[] | undefined>
): { sort: string } {
  const toStringValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  return {
    sort: toStringValue(params.sort) || '',
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await (searchParams ?? Promise.resolve({})) as Record<string, string | string[] | undefined>;
  const { sort: currentSort } = normalizeSearchParams(resolvedSearchParams);

  const collections = await fetchCollections();

  return (
    <div className="catalog-page">
      <section className="plp-new">
        <Suspense fallback={null}>
          <PLPLayoutClient
            collections={collections}
            currentSort={currentSort}
          />
        </Suspense>
      </section>
    </div>
  );
}
