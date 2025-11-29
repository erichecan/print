/**
 * Mobile Filter Drawer Component
 * [2025-01-28 15:30:00] 移动端筛选抽屉组件
 */
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { DynamicFilters } from './DynamicFilters';
import ProductFilters from './ProductFilters';
import type { Brand } from '@/app/products/page';

interface MobileFilterDrawerProps {
  currentCollection?: string;
  currentBrand?: string;
  brands?: Brand[];
}

export function MobileFilterDrawer({ currentCollection, currentBrand, brands = [] }: MobileFilterDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // [2025-01-28 15:30:00] 获取已选的筛选条件数量
  const getActiveFilterCount = () => {
    let count = 0;
    const filterKeys = ['fit', 'decoration', 'color', 'size', 'material', 'type', 'style', 'neckline', 'feature', 'price', 'brand', 'rushDelivery', 'multiAddress', 'noMinimum'];
    filterKeys.forEach(key => {
      const value = searchParams.get(key);
      if (value && value.length > 0) {
        count += value.split(',').length;
      }
    });
    return count;
  };
  
  const activeFilterCount = getActiveFilterCount();
  
  // [2025-01-28 15:30:00] 防止滚动当筛选抽屉打开时
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  // [2025-01-28 15:30:00] 清除所有筛选条件
  const handleClearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    const filterKeys = ['fit', 'decoration', 'color', 'size', 'material', 'type', 'style', 'neckline', 'feature', 'price', 'brand', 'rushDelivery', 'multiAddress', 'noMinimum'];
    filterKeys.forEach(key => {
      params.delete(key);
    });
    params.delete('page'); // 重置到第一页
    router.push(`${pathname}?${params.toString()}`);
    setIsOpen(false);
  };
  
  // [2025-01-28 15:30:00] 关闭筛选抽屉
  const handleClose = () => {
    setIsOpen(false);
  };
  
  return (
    <>
      {/* [2025-01-28 15:30:00] 移动端筛选按钮 */}
      <button
        type="button"
        className="mobile-filter-toggle"
        onClick={() => setIsOpen(true)}
        aria-label="Open filters"
      >
        <span className="mobile-filter-toggle__icon">⚙️</span>
        <span className="mobile-filter-toggle__label">Filters</span>
        {activeFilterCount > 0 && (
          <span className="mobile-filter-toggle__badge" aria-label={`${activeFilterCount} active filters`}>
            {activeFilterCount}
          </span>
        )}
      </button>
      
      {/* [2025-01-28 15:30:00] 遮罩层 */}
      <div 
        className={`mobile-filter-overlay ${isOpen ? 'mobile-filter-overlay--open' : ''}`}
        onClick={handleClose}
        aria-hidden={!isOpen}
      ></div>
      
      {/* [2025-01-28 15:30:00] 筛选抽屉 */}
      <div 
        className={`mobile-filter-drawer ${isOpen ? 'mobile-filter-drawer--open' : ''}`}
        aria-hidden={!isOpen}
      >
        <div className="mobile-filter-drawer__header">
          <h2 className="mobile-filter-drawer__title">Filters</h2>
          <button
            type="button"
            className="mobile-filter-drawer__close"
            onClick={handleClose}
            aria-label="Close filters"
          >
            ×
          </button>
        </div>
        
        {/* [2025-01-28 15:30:00] 已选筛选条件显示 */}
        {activeFilterCount > 0 && (
          <div className="mobile-filter-drawer__active-filters">
            <div className="mobile-filter-drawer__active-filters-header">
              <span className="mobile-filter-drawer__active-count">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
              </span>
              <button
                type="button"
                className="mobile-filter-drawer__clear-link"
                onClick={handleClearFilters}
              >
                Clear all
              </button>
            </div>
          </div>
        )}
        
        {/* [2025-01-28 15:30:00] 筛选内容 */}
        <div className="mobile-filter-drawer__content">
          <ProductFilters currentCollection={currentCollection} currentBrand={currentBrand} brands={brands} />
          <DynamicFilters currentCollection={currentCollection} />
        </div>
        
        {/* [2025-01-28 15:30:00] 底部操作按钮 */}
        <div className="mobile-filter-drawer__footer">
          <button
            type="button"
            className="mobile-filter-drawer__clear-btn"
            onClick={handleClearFilters}
          >
            Clear All
          </button>
          <button
            type="button"
            className="mobile-filter-drawer__apply-btn"
            onClick={handleClose}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}

