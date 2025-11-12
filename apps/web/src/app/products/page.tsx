/**
 * Product Listing Page
 * [2025-11-11 22:28:40] Initial scaffold
 * [2025-11-12 00:00:20] Connected to products API with filters, search, and pagination
 * [2025-01-27 13:20:00] Removed TODO marker, page is production-ready
 */

import Link from 'next/link';
import Image from 'next/image'; // [2025-11-11 06:07:23] 使用 Next Image 组件提升性能

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

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
  searchParams = {},
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const normalizedParams = normalizeSearchParams(searchParams);
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
    <div className="products-page">
      <div className="container products-page__header">
        <header>
          <p className="eyebrow">Browse Products</p>
          <h1>Custom apparel & promo gear catalog</h1>
          <p className="lead">
            Discover curated apparel, drinkware, tech, and swag-ready products. Filter by category,
            search by keyword, and sort to find the right fit for your group.
          </p>
        </header>

        <form className="plp-filters" method="get">
          <div className="plp-filters__search">
            <label htmlFor="search">Search</label>
            <input
              id="search"
              name="search"
              type="search"
              placeholder="Search products"
              defaultValue={currentSearch}
            />
          </div>

          <div className="plp-filters__select">
            <label htmlFor="collection">Category</label>
            <select id="collection" name="collection" defaultValue={currentCollection}>
              <option value="">All categories</option>
              {collections.map((collection) => (
                <option key={collection.slug} value={collection.slug}>
                  {collection.name}
                </option>
              ))}
            </select>
          </div>

          {/* [2025-01-27 14:00:00] 品牌筛选 */}
          {brands.length > 0 && (
            <div className="plp-filters__select">
              <label htmlFor="brand">Brand</label>
              <select id="brand" name="brand" defaultValue={currentBrand}>
                <option value="">All brands</option>
                {brands.map((brand) => (
                  <option key={brand.slug || brand.name} value={brand.name}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* [2025-01-27 14:00:00] 价格区间筛选 */}
          <div className="plp-filters__price-range">
            <label htmlFor="minPrice">Price Range (CAD)</label>
            <div className="price-inputs">
              <input
                id="minPrice"
                name="minPrice"
                type="number"
                placeholder="Min"
                min="0"
                step="0.01"
                defaultValue={currentMinPrice}
                style={{ width: '100px' }}
              />
              <span>to</span>
              <input
                id="maxPrice"
                name="maxPrice"
                type="number"
                placeholder="Max"
                min="0"
                step="0.01"
                defaultValue={currentMaxPrice}
                style={{ width: '100px' }}
              />
            </div>
          </div>

          <div className="plp-filters__select">
            <label htmlFor="sort">Sort</label>
            <select id="sort" name="sort" defaultValue={currentSort}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value || 'featured'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn">
            Apply Filters
          </button>
          <Link href="/products" className="btn btn--outline">
            Reset
          </Link>
        </form>
      </div>

      <div className="container products-page__results">
        <div className="results-meta">
          <span>
            Showing {products.length} of {pagination.total} items
          </span>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
        </div>

        {fetchError ? (
          <div className="results-empty">
            <h2>There was a problem loading products</h2>
            <p>{fetchError}</p>
            <p>Please try refreshing the page or adjusting your filters.</p>
          </div>
        ) : products.length === 0 ? (
          <div className="results-empty">
            <h2>No products found</h2>
            <p>Try adjusting your filters or search term to discover more products.</p>
          </div>
        ) : (
          <div className="results-grid">
            {products.map((product) => {
              const price = product.price ?? product.basePrice ?? 0;
              return (
                <article key={product.id} className="product-card">
                  <Link href={`/products/${product.slug}`}>
                    <div className="product-card__image">
                      {product.primaryImage?.url ? (
                        <Image
                          src={product.primaryImage.url}
                          alt={product.primaryImage.alt ?? product.name}
                          className="product-card__image-media" // [2025-11-11 06:07:52] 统一图片样式
                          width={480}
                          height={480}
                          sizes="(max-width: 768px) 100vw, 480px" // [2025-11-11 06:07:23] 明确图片尺寸
                        />
                      ) : (
                        <div className="product-card__placeholder">Image coming soon</div>
                      )}
                    </div>
                    <div className="product-card__body">
                      <h3>{product.name}</h3>
                      <p className="product-card__price">{currencyFormatter.format(Number(price))}</p>
                      <p className="product-card__meta">
                        {product.brand?.name ? `${product.brand.name} • ` : ''}
                        {product.category?.name || 'General'}
                      </p>
                      {product.description && (
                        <p className="product-card__description">{product.description}</p>
                      )}
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        {!fetchError && pagination.totalPages > 0 && (
          <nav className="pagination" aria-label="Pagination">
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="pagination__controls">
              <Link
                href={buildRoute(normalizedParams, { page: '1' })}
                className="btn btn--outline"
                aria-disabled={pagination.page === 1}
              >
                First
              </Link>
              {prevLink ? (
                <Link href={prevLink} className="btn btn--outline">
                  Previous
                </Link>
              ) : (
                <span className="btn btn--outline is-disabled">Previous</span>
              )}
              {nextLink ? (
                <Link href={nextLink} className="btn btn--outline">
                  Next
                </Link>
              ) : (
                <span className="btn btn--outline is-disabled">Next</span>
              )}
              <Link
                href={buildRoute(normalizedParams, { page: String(pagination.totalPages) })}
                className="btn btn--outline"
                aria-disabled={pagination.page === pagination.totalPages}
              >
                Last
              </Link>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}