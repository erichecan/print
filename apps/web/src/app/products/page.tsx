/**
 * Product Listing Page
 * [2025-11-11 22:28:40] Initial scaffold
 * [2025-11-12 00:00:20] Connected to products API with filters, search, and pagination
 * [2025-01-27 13:20:00] Removed TODO marker, page is production-ready
 * [2025-01-27 17:00:00] 补充 SEO 元数据
 * [2025-01-27 18:30:00] 完全重新设计布局以匹配参考设计，包含完整的筛选器和产品卡片
 */

import Link from 'next/link';
import Image from 'next/image'; // [2025-11-11 06:07:23] 使用 Next Image 组件提升性能
// [2025-11-15 11:20:00] 使用集中管理的 API 配置
import { API_BASE_URL } from '@/lib/api-config';
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import SortSelect from './SortSelect';

// [2025-01-27 16:45:00] 客户端筛选组件
const ProductFiltersClient = dynamic(() => import('@/components/products/ProductFilters').then(mod => ({ default: mod.ProductFilters })), { ssr: false });
// [2025-01-27 17:00:00] 动态筛选器组件（从API获取筛选选项和数量）
const DynamicFilters = dynamic(() => import('@/components/products/DynamicFilters').then(mod => mod.DynamicFilters), { ssr: false });
// [2025-01-28 15:30:00] 移动端筛选抽屉组件
const MobileFilterDrawer = dynamic(() => import('@/components/products/MobileFilterDrawer').then(mod => mod.MobileFilterDrawer), { ssr: false });

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
  { label: 'Recommended', value: '' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Name: A to Z', value: 'name_asc' },
  { label: 'Name: Z to A', value: 'name_desc' },
];

// [2025-01-27 18:30:00] T-shirt分类列表
const TSHIRT_CATEGORIES = [
  { name: 'Short Sleeve T-shirts', slug: 'short-sleeve-t-shirts', active: true },
  { name: 'Long Sleeve T-shirts', slug: 'long-sleeve-t-shirts', active: false },
  { name: 'Soft Tri-Blend T-shirts', slug: 'soft-tri-blend-t-shirts', active: false },
  { name: 'Performance Shirts', slug: 'performance-shirts', active: false },
  { name: "Women's T-shirts", slug: 'womens-t-shirts', active: false },
];

// [2025-01-27 18:30:00] 筛选选项数据
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
  
  // [2025-01-27 16:45:00] 创建客户端筛选器包装组件（必须在服务器组件中处理）
  let collections: Collection[] = [];
  let productsResponse: ProductsResponse | null = null;
  let fetchError: string | null = null;

  // [2025-11-16 16:28:00] 解耦列表与集合请求，避免 /collections 404 影响产品渲染
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

  // [2025-11-16 16:45:00] 使用动态导入的客户端组件，禁用 SSR，避免服务端报错影响页面渲染
  const ProductsClient = dynamic(() => import('./ProductsClient'), { ssr: false });

  // [2025-01-27 18:30:00] 获取当前分类名称用于面包屑
  const currentCategoryName = currentCollection 
    ? collections.find(c => c.slug === currentCollection)?.name || 'T-shirts'
    : 'T-shirts';

  return (
    <div className="catalog-page">
      {/* [2025-01-27 18:30:00] 完全重新设计的布局以匹配参考设计 */}
      <section className="plp-new">
        <div className="container plp-new__grid">
          {/* 左侧筛选器 */}
          <aside className="plp-new__sidebar">
            {/* [2025-01-27 16:45:00] 使用客户端筛选组件处理筛选逻辑 */}
            <ProductFiltersClient currentCollection={currentCollection} currentBrand={currentBrand} brands={brands} />
            {/* [2025-01-27 17:00:00] 使用动态筛选器组件（从API获取筛选选项和数量） */}
            {/* [2025-01-28] 移除表单和按钮，改为实时筛选（参考 Custom Ink） */}
            <DynamicFilters currentCollection={currentCollection} />
          </aside>

          {/* 主内容区 */}
          <div className="plp-new__main">
            {/* [2025-01-28 15:30:00] 移动端筛选按钮 */}
            <MobileFilterDrawer 
              currentCollection={currentCollection} 
              currentBrand={currentBrand} 
              brands={brands} 
            />
            
            {/* 面包屑和标题 */}
            <nav className="breadcrumb-nav">
              <ol>
                <li><Link href="/products">All Products</Link></li>
                <li>›</li>
                <li><Link href="/products?collection=t-shirts">T-shirts</Link></li>
                <li>›</li>
                <li>{currentCategoryName}</li>
              </ol>
            </nav>

            <h1 className="plp-new__title">{currentCategoryName}</h1>

            {/* 排序 */}
            <SortSelect defaultValue={currentSort} />

            {/* 产品网格 */}
            <ProductsClient />
          </div>
        </div>
      </section>
    </div>
  );
}