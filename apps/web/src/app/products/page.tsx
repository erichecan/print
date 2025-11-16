/**
 * Product Listing Page
 * [2025-11-11 22:28:40] Initial scaffold
 * [2025-11-12 00:00:20] Connected to products API with filters, search, and pagination
 * [2025-01-27 13:20:00] Removed TODO marker, page is production-ready
 * [2025-01-27 17:00:00] 补充 SEO 元数据
 */

import Link from 'next/link';
import Image from 'next/image'; // [2025-11-11 06:07:23] 使用 Next Image 组件提升性能
// [2025-11-15 11:20:00] 使用集中管理的 API 配置
import { API_BASE_URL } from '@/lib/api-config';
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

// [2025-01-27 17:00:00] 生成产品列表页 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Browse All Products - Custom T-Shirts, Hoodies & More',
  description: 'Browse our full catalog of custom t-shirts, hoodies, apparel, and promotional products. Filter by category, price, and brand. Free shipping available.',
  keywords: ['custom t-shirts', 'custom hoodies', 'apparel', 'promotional products', 'custom merchandise', 'bulk orders'],
  url: 'https://suvernireplus.com/products',
  image: 'https://suvernireplus.com/assets/hero/hero-card-tee.jpg',
});

type SearchParams = {
  page?: string;
  limit?: string;
  search?: string;
  sort?: string;
  collection?: string;
  brand?: string; // [2025-01-27 14:00:00] 品牌筛选
  minPrice?: string; // [2025-01-27 14:00:00] 最低价格
  maxPrice?: string; // [2025-01-27 14:00:00] 最高价格
};

type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  basePrice?: number;
  price?: number;
  primaryImage?: {
    url: string | null;
    alt: string | null;
  };
  category?: {
    name: string;
    slug: string;
  } | null;
  brand?: {
    name: string;
  } | null;
};

type ProductsResponse = {
  data: ProductListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type Collection = {
  id: string;
  name: string;
  slug: string;
};

type Brand = {
  name: string;
  slug?: string;
};

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

const SORT_OPTIONS = [
  { label: 'Featured', value: '' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Name: A to Z', value: 'name_asc' },
  { label: 'Name: Z to A', value: 'name_desc' },
];

function mapSortValue(value: string | undefined) {
  switch (value) {
    case 'price_asc':
      return { sort: 'price', order: 'asc' };
    case 'price_desc':
      return { sort: 'price', order: 'desc' };
    case 'name_asc':
      return { sort: 'name', order: 'asc' };
    case 'name_desc':
      return { sort: 'name', order: 'desc' };
    default:
      return { sort: undefined, order: undefined };
  }
}

function buildApiUrl(path: string, params: Record<string, string | undefined>) {
  const url = new URL(path, API_BASE_URL);
  Object.entries(params)
    .filter(([, value]) => Boolean(value))
    .forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
  return url.toString();
}

async function fetchProducts(searchParams: SearchParams) {
  const page = Number(searchParams.page || '1');
  const limit = Number(searchParams.limit || '12');
  const { sort, order } = mapSortValue(searchParams.sort);

  const url = buildApiUrl('/products', {
    page: page.toString(),
    limit: limit.toString(),
    search: searchParams.search,
    collection: searchParams.collection,
    brand: searchParams.brand, // [2025-01-27 14:00:00] 品牌筛选
    minPrice: searchParams.minPrice, // [2025-01-27 14:00:00] 最低价格
    maxPrice: searchParams.maxPrice, // [2025-01-27 14:00:00] 最高价格
    sort,
    order,
  });

  const response = await fetch(url, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch products (${response.status})`);
  }

  return (await response.json()) as ProductsResponse;
}

async function fetchCollections() {
  const url = buildApiUrl('/collections', {});
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    return [] as Collection[];
  }
  return (await response.json()) as Collection[];
}

function buildRoute(searchParams: SearchParams, overrides: Partial<SearchParams>) {
  const params = new URLSearchParams();
  const merged: SearchParams = {
    ...searchParams,
    ...overrides,
  };

  Object.entries(merged).forEach(([key, value]) => {
    if (value && value.length > 0) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `/products?${query}` : '/products';
}

function normalizeSearchParams(
  params: Record<string, string | string[] | undefined>
): SearchParams {
  const toStringValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  return {
    page: toStringValue(params.page),
    limit: toStringValue(params.limit),
    search: toStringValue(params.search),
    sort: toStringValue(params.sort),
    collection: toStringValue(params.collection),
    brand: toStringValue(params.brand), // [2025-01-27 14:00:00] 品牌筛选
    minPrice: toStringValue(params.minPrice), // [2025-01-27 14:00:00] 最低价格
    maxPrice: toStringValue(params.maxPrice), // [2025-01-27 14:00:00] 最高价格
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  // [2025-01-27 15:15:00] Next.js 15: searchParams 现在是异步的
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await (searchParams ?? Promise.resolve({}));
  const normalizedParams = normalizeSearchParams(resolvedSearchParams);
  let collections: Collection[] = [];
  let productsResponse: ProductsResponse | null = null;
  let fetchError: string | null = null;

  try {
    [productsResponse, collections] = await Promise.all([
      fetchProducts(normalizedParams),
      fetchCollections(),
    ]);
  } catch (error: unknown) {
    fetchError = error instanceof Error ? error.message : 'Unexpected error loading products.';
    collections = await fetchCollections().catch(() => []);
  }

  const products = productsResponse?.data ?? [];
  const pagination = productsResponse?.pagination ?? {
    page: Number(normalizedParams.page || '1'),
    limit: Number(normalizedParams.limit || '12'),
    total: 0,
    totalPages: 1,
  };
  const currentSort = normalizedParams.sort || '';
  const currentSearch = normalizedParams.search || '';
  const currentCollection = normalizedParams.collection || '';
  const currentBrand = normalizedParams.brand || ''; // [2025-01-27 14:00:00] 当前品牌筛选
  const currentMinPrice = normalizedParams.minPrice || ''; // [2025-01-27 14:00:00] 当前最低价格
  const currentMaxPrice = normalizedParams.maxPrice || ''; // [2025-01-27 14:00:00] 当前最高价格

  // [2025-01-27 14:00:00] 从产品数据中提取品牌列表
  const brands: Brand[] = Array.from(
    new Map(
      products
        .filter((p) => p.brand?.name)
        .map((p) => [p.brand!.name, { name: p.brand!.name, slug: p.brand!.name.toLowerCase().replace(/\s+/g, '-') }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const prevLink =
    pagination.page > 1
      ? buildRoute(normalizedParams, { page: String(pagination.page - 1) })
      : null;
  const nextLink =
    pagination.page < pagination.totalPages
      ? buildRoute(normalizedParams, { page: String(pagination.page + 1) })
      : null;

  return (
    <div className="catalog-page">
      <div className="plp-head">
        <div className="container plp-head__bar">
          <div>
            <p className="eyebrow">Shop the catalog</p>
            <h1>Custom apparel & promo gear</h1>
            <p className="plp-head__meta">
              <span>
                {pagination.total} items · Page {pagination.page} of {pagination.totalPages}
              </span>
            </p>
          </div>
          <div className="plp-head__actions">
            <Link href="/design-lab" className="btn">
              Start Designing
            </Link>
            <Link href="/contact" className="btn btn--outline">
              Get a Quote
            </Link>
          </div>
        </div>
      </div>

      {/* [2025-11-16 11:15:00] Prototype-aligned PLP layout */}
      <section className="plp">
        <div className="container plp__grid">
          <aside>
            <form className="filters" method="get">
              <details open>
                <summary>Search catalog</summary>
                <div className="filters__body">
                  <input
                    type="search"
                    name="search"
                    placeholder="Search tees, hoodies, drinkware..."
                    defaultValue={currentSearch}
                  />
                </div>
              </details>

              <details open>
                <summary>Category</summary>
                <div className="filters__body">
                  <select name="collection" defaultValue={currentCollection}>
                    <option value="">All categories</option>
                    {collections.map((collection) => (
                      <option key={collection.slug} value={collection.slug}>
                        {collection.name}
                      </option>
                    ))}
                  </select>
                </div>
              </details>

              {brands.length > 0 && (
                <details>
                  <summary>Brand</summary>
                  <div className="filters__body">
                    <select name="brand" defaultValue={currentBrand}>
                      <option value="">All brands</option>
                      {brands.map((brand) => (
                        <option key={brand.slug || brand.name} value={brand.name}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </details>
              )}

              <details>
                <summary>Price range (CAD)</summary>
                <div className="filters__body">
                  <div className="price-inputs">
                    <input
                      type="number"
                      name="minPrice"
                      placeholder="Min"
                      min="0"
                      step="0.01"
                      defaultValue={currentMinPrice}
                    />
                    <span>to</span>
                    <input
                      type="number"
                      name="maxPrice"
                      placeholder="Max"
                      min="0"
                      step="0.01"
                      defaultValue={currentMaxPrice}
                    />
                  </div>
                </div>
              </details>

              <details>
                <summary>Sort by</summary>
                <div className="filters__body">
                  <select name="sort" defaultValue={currentSort}>
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value || 'featured'} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </details>

              <div className="filters__actions">
                <button type="submit" className="btn">
                  Apply Filters
                </button>
                <Link href="/products" className="btn btn--outline">
                  Reset
                </Link>
              </div>
            </form>
          </aside>

          <div className="products">
            <div className="results-meta">
              <span>
                Showing {products.length} of {pagination.total} products
              </span>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
            </div>

            {fetchError ? (
              <div className="results-empty">
                <h2>We hit a snag loading products</h2>
                <p>{fetchError}</p>
                <p>Refresh the page or adjust your filters and try again.</p>
              </div>
            ) : products.length === 0 ? (
              <div className="results-empty">
                <h2>No products found</h2>
                <p>Try expanding your filters or enter a different search.</p>
              </div>
            ) : (
              <div className="product-grid">
                {products.map((product) => {
                  const price = product.price ?? product.basePrice ?? 0;
                  return (
                    <article key={product.id} className="product">
                      <Link href={`/products/${product.slug}`} className="product__image">
                        {product.primaryImage?.url ? (
                          <Image
                            src={product.primaryImage.url}
                            alt={product.primaryImage.alt ?? product.name}
                            width={480}
                            height={480}
                            sizes="(max-width: 768px) 100vw, 320px"
                          />
                        ) : (
                          <div className="product-card__placeholder">Image coming soon</div>
                        )}
                      </Link>
                      <h3 className="product__title">{product.name}</h3>
                      <p className="product__meta">
                        {product.category?.name ?? 'All categories'} ·{' '}
                        {product.brand?.name ?? 'Multiple brands'}
                      </p>
                      <p className="product__description">
                        {product.description ??
                          'Suvernire Plus staples ready for screen-print, embroidery, or rush delivery.'}
                      </p>
                      <p className="product__price">{currencyFormatter.format(Number(price))}</p>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="pagination">
              <div className="pagination__controls">
                <Link href={prevLink ?? '#'} className="btn btn--outline" aria-disabled={!prevLink}>
                  Previous
                </Link>
                <Link href={nextLink ?? '#'} className="btn" aria-disabled={!nextLink}>
                  Next
                </Link>
              </div>
              <p>
                Page {pagination.page} of {pagination.totalPages}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}