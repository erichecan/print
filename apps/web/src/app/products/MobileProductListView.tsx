'use client';

import Link from 'next/link';
import { MobileProductCard } from '@/components/products/MobileProductCard';
import { MobileFilterDrawer } from '@/components/products/MobileFilterDrawer';
import { Pagination } from '@/components/ui/Pagination';
import SortSelect from './SortSelect';
import { Promotion } from '@/lib/api';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: { base: number; sale: number; currency: string };
  primaryImage?: { url: string | null; alt?: string | null } | null;
  images?: Array<{ url: string; alt?: string | null }>;
  category?: { name: string } | null;
  brand?: { name: string } | null;
  variants?: Array<{ color?: string; colorHex?: string; imageUrl?: string | null }>;
  rating?: { average: number; count: number };
  promotions?: Promotion[];
}

interface MobileProductListViewProps {
  products: Product[];
  categoryName: string;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  currentSort: string;
  currentCollection: string;
  currentBrand: string;
  brands: any[];
}

export function MobileProductListView({
  products,
  categoryName,
  pagination,
  currentSort,
  currentCollection,
  currentBrand,
  brands
}: MobileProductListViewProps) {
  return (
    <div className="mobile-plp">
      {/* Breadcrumbs */}
      <nav className="mobile-plp__breadcrumbs">
        <Link href="/products">All Products</Link>
        <span className="separator">{'>'}</span>
        <Link href="/products?category=t-shirts">T-shirts</Link>
        <span className="separator">{'>'}</span>
        <span className="current">{categoryName}</span>
      </nav>

      {/* Title */}
      <h1 className="mobile-plp__title">{categoryName}</h1>

      {/* Controls Bar */}
      <div className="mobile-plp__controls">
        <div className="mobile-plp__filter-btn">
          <MobileFilterDrawer
            currentCollection={currentCollection}
            currentBrand={currentBrand}
            brands={brands}
          />
        </div>
        <div className="mobile-plp__sort">
          <span className="sort-label">Sort By:</span>
          <SortSelect defaultValue={currentSort} />
        </div>
      </div>

      {/* Product List */}
      <div className="mobile-plp__list">
        {products.map((product, index) => (
          <MobileProductCard key={product.id} product={product} index={index} />
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mobile-plp__pagination">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            baseUrl="/products"
            preserveParams={true}
          />
        </div>
      )}

      <style jsx>{`
        .mobile-plp {
          padding: 12px 0;
          background: #fff;
        }
        .mobile-plp__breadcrumbs {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          margin: 0 16px 12px 16px;
        }
        .mobile-plp__breadcrumbs a {
          color: #2563eb;
          text-decoration: none;
        }
        .separator {
          color: #999;
          font-size: 10px;
        }
        .current {
          color: #666;
        }
        .mobile-plp__title {
          font-size: 24px;
          font-weight: 800;
          margin: 0 16px 16px 16px;
          color: #333;
        }
        .mobile-plp__controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid #eee;
          border-bottom: 1px solid #eee;
          padding: 10px 16px;
          margin-bottom: 8px;
        }
        .mobile-plp__sort {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 14px;
        }
        .sort-label {
          color: #666;
        }
        .mobile-plp__list {
          display: flex;
          flex-direction: column;
        }
        .mobile-plp__pagination {
          margin-top: 24px;
          padding-bottom: 32px;
        }
        
        /* Override SortSelect styles for mobile if needed */
        :global(.sort-select-container) {
          margin: 0 !important;
        }
        :global(.mobile-filter-toggle) {
          border: none;
          background: none;
          padding: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }
      `}</style>
    </div>
  );
}
