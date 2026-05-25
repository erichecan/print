'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import SortSelect from './SortSelect';

const SidebarGrouped = dynamic(
  () => import('@/components/catalog/SidebarGrouped').then(mod => ({ default: mod.SidebarGrouped })),
  { ssr: false }
);
const ProductFiltersClient = dynamic(
  () => import('@/components/products/ProductFilters').then(mod => ({ default: mod.ProductFilters })),
  { ssr: false }
);
const DynamicFilters = dynamic(
  () => import('@/components/products/DynamicFilters').then(mod => ({ default: mod.DynamicFilters })),
  { ssr: false }
);
const ProductsClient = dynamic(() => import('./ProductsClient'), { ssr: false });

type Collection = { id: string; name: string; slug: string };
type Brand = { name: string; slug?: string };

export function PLPLayoutClient({
  collections,
  currentSort,
  currentCollection,
  currentBrand,
  currentCategoryName,
  brands,
  groupSlug,
  categorySlug,
}: {
  collections: Collection[];
  currentSort: string;
  currentCollection: string;
  currentBrand: string;
  currentCategoryName: string;
  brands: Brand[];
  groupSlug?: string;
  categorySlug?: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={sidebarOpen ? 'plp-layout plp-layout--sidebar-open' : 'plp-layout'}>
      {/* 工具栏：面包屑 + 标题 + 筛选入口 + 排序 */}
      <div className="plp-toolbar hidden md:block">
        <nav className="breadcrumb-nav">
          <ol>
            <li><Link href="/products">All Products</Link></li>
            <li>›</li>
            <li><Link href="/products?category=t-shirts">T-shirts</Link></li>
            <li>›</li>
            <li>{currentCategoryName}</li>
          </ol>
        </nav>

        <div className="plp-toolbar__row">
          <h1 className="plp-new__title">{currentCategoryName}</h1>
          <div className="plp-toolbar__actions">
            <button
              className={`plp-filter-btn${sidebarOpen ? ' plp-filter-btn--active' : ''}`}
              onClick={() => setSidebarOpen(v => !v)}
              aria-expanded={sidebarOpen}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="11" y1="18" x2="13" y2="18" />
              </svg>
              {sidebarOpen ? 'Hide Filters' : 'Filters'}
            </button>
            <SortSelect defaultValue={currentSort} />
          </div>
        </div>
      </div>

      {/* 主体网格：筛选栏 + 商品区 */}
      <div className="plp-new__grid">
        <aside className="plp-new__sidebar">
          <SidebarGrouped selected={{ groupSlug, childSlug: categorySlug }} />
          <ProductFiltersClient
            currentCollection={currentCollection}
            currentBrand={currentBrand}
            brands={brands}
          />
          <DynamicFilters currentCollection={currentCollection} />
        </aside>

        <div className="plp-new__main">
          <ProductsClient
            collections={collections}
            initialCategoryName={currentCategoryName}
          />
        </div>
      </div>
    </div>
  );
}
