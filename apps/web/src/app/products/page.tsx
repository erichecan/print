/**
 * Product Listing Page
* Initial scaffold
* Connected to products API with filters, search, and pagination
* Removed TODO marker, page is production-ready
* 补充 SEO 元数据
* 完全重新设计布局以匹配参考设计，包含完整的筛选器和产品卡片
 */

import { apiGet } from '@/lib/apiClient';
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const PLPLayoutClient = dynamic(
  () => import('./PLPLayoutClient').then(mod => ({ default: mod.PLPLayoutClient })),
  { ssr: false }
);

// 生成产品列表页 SEO 元数据
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
  category?: string; // 支持 category 筛选
  brand?: string; // 品牌筛选
  minPrice?: string; // 最低价格
  maxPrice?: string; // 最高价格
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
  { label: 'Recommended', value: '' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Name: A to Z', value: 'name_asc' },
  { label: 'Name: Z to A', value: 'name_desc' },
];

// T-shirt分类列表
const TSHIRT_CATEGORIES = [
  { name: 'Short Sleeve T-shirts', slug: 'short-sleeve-t-shirts', active: true },
  { name: 'Long Sleeve T-shirts', slug: 'long-sleeve-t-shirts', active: false },
  { name: 'Soft Tri-Blend T-shirts', slug: 'soft-tri-blend-t-shirts', active: false },
  { name: 'Performance Shirts', slug: 'performance-shirts', active: false },
  { name: "Women's T-shirts", slug: 'womens-t-shirts', active: false },
];

// 筛选选项数据
const FIT_OPTIONS = [
  { name: 'Standard Fit', count: 156 },
  { name: 'Relaxed Fit', count: 44 },
  { name: 'Semi-Fitted', count: 38 },
  { name: 'Slim Fit', count: 16 },
];

const DECORATION_OPTIONS = [
  { name: 'Printed', count: 250 },
  { name: 'Embroidered', count: 9 },
];

const COLOR_FAMILIES = [
  { name: 'Black', hex: '#000000' },
  { name: 'Blue', hex: '#0066CC' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Grey', hex: '#808080' },
  { name: 'Green', hex: '#00CC00' },
  { name: 'Red', hex: '#CC0000' },
  { name: 'Pink', hex: '#FF99CC' },
  { name: 'Purple', hex: '#9933CC' },
  { name: 'Yellow', hex: '#FFCC00' },
  { name: 'Orange', hex: '#FF9900' },
  { name: 'Brown', hex: '#996633' },
  { name: 'Heather', hex: '#CCCCCC', pattern: true },
  { name: 'Camo', hex: '#4A5D23', pattern: true },
  { name: 'Tie-Dye', hex: '#FF00FF', pattern: true },
];

const RUSH_DELIVERY_OPTIONS = [
  { days: '3 days', label: 'Super Rush', icon: '⚡' },
  { days: '1 week', label: 'Rush' },
  { days: '10 days', label: 'Rush' },
  { days: '12 days', label: 'Rush' },
];

const MATERIAL_OPTIONS = [
  { name: '100% Cotton', count: 120 },
  { name: 'Cotton/Poly', count: 72 },
  { name: '100% Polyester', count: 50 },
  { name: 'Recycled Material', count: 30 },
  { name: 'Tri-Blend (Poly/Cotton/Rayon)', count: 28 },
  { name: 'Performance Blend', count: 4 },
  { name: 'Poly/Cotton/Spandex', count: 2 },
];

const TYPE_OPTIONS = [
  { name: 'Unisex', count: 180 },
  { name: "Women's", count: 71 },
  { name: 'Youth', count: 67 },
  { name: 'Tall', count: 6 },
];

const SIZE_OPTIONS = [
  { name: '2XS', count: 4 },
  { name: 'XS', count: 125 },
  { name: 'S', count: 248 },
  { name: 'M', count: 249 },
  { name: 'L', count: 245 },
  { name: 'XL', count: 220 },
  { name: '2XL', count: 180 },
  { name: '3XL', count: 120 },
];

const STYLE_OPTIONS = [
  { name: 'Performance', count: 51 },
  { name: 'Pocket', count: 22 },
  { name: 'Workwear', count: 16 },
  { name: 'Cropped', count: 9 },
  { name: 'Ringer', count: 3 },
  { name: 'Henley', count: 2 },
  { name: 'Raglan', count: 1 },
];

const NECKLINE_OPTIONS = [
  { name: 'Crew Neck', count: 224 },
  { name: 'V-Neck', count: 25 },
  { name: 'Scoop Neck', count: 7 },
  { name: 'Henley', count: 2 },
];

const PRODUCT_FEATURES_OPTIONS = [
  { name: 'Tear Away Tag', count: 144 },
  { name: 'Eco-friendly', count: 91 },
  { name: 'Moisture-Wicking', count: 62 },
  { name: 'Tagless', count: 34 },
  { name: 'UV Protection', count: 26 },
  { name: 'Pocket', count: 23 },
  { name: 'ANSI Compliant', count: 12 },
];

const PRICE_OPTIONS = [
  { name: '$', count: 117 },
  { name: '$$', count: 109 },
  { name: '$$$', count: 33 },
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

// 使用统一的 API 客户端，移除 buildApiUrl
async function fetchProducts(searchParams: SearchParams) {
  const page = Number(searchParams.page || '1');
  const limit = Number(searchParams.limit || '12');
  const { sort, order } = mapSortValue(searchParams.sort);

  try {
    const response = await apiGet<ProductsResponse>('/products', {
      page: page.toString(),
      limit: limit.toString(),
      search: searchParams.search,
      collection: searchParams.collection,
      brand: searchParams.brand, // 品牌筛选
      minPrice: searchParams.minPrice, // 最低价格
      maxPrice: searchParams.maxPrice, // 最高价格
      sort,
      order,
    }, {
      timeout: 10000,
    });

    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      throw new Error('Request timeout: Failed to fetch products');
    }
    throw error;
  }
}

async function fetchCollections() {
  try {
    const response = await apiGet<Collection[]>('/collections', {}, {
      timeout: 10000,
    });
    return response;
  } catch (error) {
    // 如果获取 collections 失败，返回空数组而不是抛出错误
    console.warn('[Products Page] Failed to fetch collections:', error);
    return [] as Collection[];
  }
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
    brand: toStringValue(params.brand), // 品牌筛选
    minPrice: toStringValue(params.minPrice), // 最低价格
    maxPrice: toStringValue(params.maxPrice), // 最高价格
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  // Next.js 15: searchParams 现在是异步的
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await (searchParams ?? Promise.resolve({})) as Record<string, string | string[] | undefined>;
  const normalizedParams = normalizeSearchParams(resolvedSearchParams);

  // 创建客户端筛选器包装组件（必须在服务器组件中处理）
  let collections: Collection[] = [];
  let productsResponse: ProductsResponse | null = null;
  let fetchError: string | null = null;

  // 解耦列表与集合请求，避免 /collections 404 影响产品渲染
  const productsPromise = fetchProducts(normalizedParams).catch((error: unknown) => {
    fetchError = error instanceof Error ? error.message : 'Unexpected error loading products.';
    return null;
  });
  const collectionsPromise = fetchCollections().catch(() => [] as Collection[]);

  [productsResponse, collections] = await Promise.all([productsPromise, collectionsPromise]);

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
  const currentBrand = normalizedParams.brand || ''; // 当前品牌筛选
  const currentMinPrice = normalizedParams.minPrice || ''; // 当前最低价格
  const currentMaxPrice = normalizedParams.maxPrice || ''; // 当前最高价格

  // 从产品数据中提取品牌列表
  const brands: Brand[] = Array.from(
    new Map(
      products
        .filter((p) => p.brand?.name)
        .map((p) => [p.brand!.name, { name: p.brand!.name, slug: p.brand!.name.toLowerCase().replace(/\s+/g, '-') }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const currentCategoryName = currentCollection
    ? (collections.find(c => c.slug === currentCollection)?.name || 'All Products')
    : (normalizedParams.category
      ? (normalizedParams.category.charAt(0).toUpperCase() + (normalizedParams.category as string).slice(1).replace(/-/g, ' '))
      : 'All Products');

  return (
    <div className="catalog-page">
      <section className="plp-new">
        <PLPLayoutClient
          collections={collections}
          currentSort={currentSort}
          currentCollection={currentCollection}
          currentBrand={currentBrand}
          currentCategoryName={currentCategoryName}
          brands={brands}
          groupSlug={resolvedSearchParams?.group as string | undefined}
          categorySlug={resolvedSearchParams?.category as string | undefined}
        />
      </section>
    </div>
  );
}