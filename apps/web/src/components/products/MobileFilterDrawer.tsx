/**
 * Mobile Filter Drawer Component
* 移动端筛选抽屉组件
 */
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { DynamicFilters } from './DynamicFilters';
// ProductFilters 不需要在这里导入，它只返回 null
interface Brand {
  name: string;
  slug?: string;
}

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

  // 获取已选的筛选条件数量
  const getActiveFilterCount = () => {
    let count = 0;
    const filterKeys = ['fit', 'decoration', 'color', 'size', 'material', 'type', 'style', 'neckline', 'feature', 'price', 'brand', 'rushDelivery', 'multiAddress', 'noMinimum'];
    if (searchParams) {
      filterKeys.forEach(key => {
        const value = searchParams.get(key);
        if (value && value.length > 0) {
          count += value.split(',').length;
        }
      });
    }
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  // 防止滚动当筛选抽屉打开时
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

  // 清除所有筛选条件
  const handleClearFilters = () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    const filterKeys = ['fit', 'decoration', 'color', 'size', 'material', 'type', 'style', 'neckline', 'feature', 'price', 'brand', 'rushDelivery', 'multiAddress', 'noMinimum'];
    filterKeys.forEach(key => {
      params.delete(key);
    });
    params.delete('page'); // 重置到第一页
    router.push(`${pathname}?${params.toString()}`);
    setIsOpen(false);
  };

  // 关闭筛选抽屉
  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* 移动端筛选按钮 */}
      <button
        type="button"
        className="mobile-filter-toggle"
        onClick={() => setIsOpen(true)}
        aria-label="Open filters"
      >
        <span className="mobile-filter-toggle__icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
            <line x1="2" y1="14" x2="6" y2="14" /><line x1="10" y1="8" x2="14" y2="8" /><line x1="18" y1="16" x2="22" y2="16" />
          </svg>
        </span>
        <span className="mobile-filter-toggle__label">Filters</span>
        {activeFilterCount > 0 && (
          <span className="mobile-filter-toggle__badge" aria-label={`${activeFilterCount} active filters`}>
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* 遮罩层 */}
      <div
        className={`mobile-filter-overlay ${isOpen ? 'mobile-filter-overlay--open' : ''}`}
        onClick={handleClose}
        aria-hidden={!isOpen}
      ></div>

      {/* 筛选抽屉 */}
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

        {/* 已选筛选条件显示 */}
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

        {/* 筛选内容 */}
        <div className="mobile-filter-drawer__content">
          {/* ProductFilters 返回 null，只用于注入逻辑，不需要渲染 */}
          <DynamicFilters currentCollection={currentCollection} />
        </div>

        {/* 底部操作按钮 */}
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

