/**
 * Dynamic Filters Component
 * [2025-01-27 17:00:00] 动态筛选器组件，从API获取筛选选项和数量
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { productsApi, type FilterOptions } from '@/lib/api';
import { API_BASE_URL } from '@/lib/api-config';
import useSWR from 'swr';

interface DynamicFiltersProps {
  currentCollection?: string;
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => {
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
});

// [2025-01-27 17:00:00] 预设颜色列表（用于颜色选择器）
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

export function DynamicFilters({ currentCollection }: DynamicFiltersProps) {
  const searchParams = useSearchParams();
  const search = searchParams.get('search') || '';

  // [2025-01-27 17:00:00] 从API获取筛选选项
  const filterUrl = `${API_BASE_URL}/products/filters/options?collection=${currentCollection || ''}&search=${search}`;
  const { data: filterOptions, error, isLoading } = useSWR<FilterOptions>(
    filterUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
    }
  );

  // [2025-01-27 17:00:00] 合并API返回的颜色和预设颜色，显示数量
  const getColorOptions = () => {
    if (!filterOptions) return COLOR_FAMILIES.map(c => ({ ...c, count: 0 }));
    
    const colorMap = new Map(
      filterOptions.colors.map(c => [c.name.toLowerCase(), c.count])
    );
    
    return COLOR_FAMILIES.map(color => ({
      ...color,
      count: colorMap.get(color.name.toLowerCase()) || 0,
    }));
  };

  // [2025-01-27 17:00:00] 获取分类树（一级和二级）
  const getCategoryTree = () => {
    if (!filterOptions) return [];
    
    // 只显示一级分类（parentId为null的）
    const parentCategories = filterOptions.categories.filter(cat => {
      // 如果children为空，说明可能是父分类
      // 我们需要检查实际数据来确认
      return cat.count > 0 || cat.children.length > 0;
    });

    return parentCategories.slice(0, 5); // 默认显示5个二级类目
  };

  if (isLoading) {
    return (
      <div className="filters-loading">
        <p>Loading filters...</p>
      </div>
    );
  }

  if (error || !filterOptions) {
    console.error('[DynamicFilters] Error loading filters:', error);
    // [2025-01-27 17:00:00] 如果加载失败，返回空内容而不是错误，避免破坏布局
    return null;
  }

  const categoryTree = getCategoryTree();
  const colorOptions = getColorOptions();

  return (
    <>
      {/* [2025-01-27 17:00:00] 动态分类列表 */}
      {categoryTree.length > 0 && (
        <div className="filter-section">
          <h3 className="filter-section__title">
            {categoryTree[0]?.name || 'Categories'}
          </h3>
          <ul className="filter-category-list">
            {categoryTree.map((category) => (
              <li key={category.id}>
                <Link 
                  href={`/products?collection=${category.slug}`}
                  className={`filter-category-link ${currentCollection === category.slug ? 'is-active' : ''}`}
                >
                  {category.name} ({category.count})
                </Link>
                {/* [2025-01-27 17:00:00] 显示二级分类（最多5个） */}
                {category.children.length > 0 && (
                  <ul className="filter-subcategory-list">
                    {category.children.slice(0, 5).map((child) => (
                      <li key={child.id}>
                        <Link 
                          href={`/products?collection=${child.slug}`}
                          className={`filter-category-link filter-subcategory-link ${currentCollection === child.slug ? 'is-active' : ''}`}
                        >
                          {child.name} ({child.count})
                        </Link>
                      </li>
                    ))}
                    {category.children.length > 5 && (
                      <li>
                        <button type="button" className="filter-show-more">
                          +{category.children.length - 5} more
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          {categoryTree.length > 5 && (
            <button type="button" className="filter-show-more">Show more ↓</button>
          )}
        </div>
      )}

      {/* [2025-01-27 17:00:00] 动态Fit筛选（目前返回空数组，暂不显示） */}
      {filterOptions.fit.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Fit
            <span className="filter-toggle-icon">−</span>
          </summary>
          <div className="filter-section__body">
            {filterOptions.fit.map((option) => (
              <label key={option.name} className="filter-checkbox">
                <input type="checkbox" name="fit" value={option.name.toLowerCase().replace(/\s+/g, '-')} />
                <span className="filter-checkbox__label">
                  {option.name} <span className="filter-count">({option.count})</span>
                </span>
              </label>
            ))}
          </div>
        </details>
      )}

      {/* [2025-01-27 17:00:00] 动态Decoration筛选（目前返回空数组，暂不显示） */}
      {filterOptions.decoration.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Decoration
            <span className="filter-toggle-icon">−</span>
          </summary>
          <div className="filter-section__body">
            {filterOptions.decoration.map((option) => (
              <label key={option.name} className="filter-checkbox">
                <input type="checkbox" name="decoration" value={option.name.toLowerCase()} />
                <span className="filter-checkbox__label">
                  {option.name} <span className="filter-count">({option.count})</span>
                </span>
              </label>
            ))}
          </div>
        </details>
      )}

      {/* Delivery Options - 保持不变（非商品属性） */}
      <details className="filter-section" open>
        <summary className="filter-section__title">
          Delivery Options
          <span className="filter-toggle-icon">−</span>
        </summary>
        <div className="filter-section__body">
          <p className="filter-question">Available to ship to multiple addresses?</p>
          <label className="filter-toggle">
            <input type="checkbox" name="multiAddress" />
            <span className="filter-toggle__slider">
              <span className="filter-toggle__label filter-toggle__label--no">No</span>
              <span className="filter-toggle__label filter-toggle__label--yes">Yes</span>
            </span>
          </label>
        </div>
      </details>

      {/* No Minimum - 保持不变（非商品属性） */}
      <div className="filter-section">
        <div className="filter-section__header">
          <span className="filter-section__title">No Minimum</span>
          <label className="filter-toggle">
            <input type="checkbox" name="noMinimum" />
            <span className="filter-toggle__slider">
              <span className="filter-toggle__label filter-toggle__label--no">No</span>
              <span className="filter-toggle__label filter-toggle__label--yes">Yes</span>
            </span>
          </label>
        </div>
      </div>

      {/* [2025-01-27 17:00:00] 动态颜色选择 */}
      {filterOptions.colors.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Color Family
            <span className="filter-toggle-icon">−</span>
          </summary>
          <div className="filter-section__body">
            <div className="color-grid">
              {colorOptions.map((color) => (
                <label key={color.name} className="color-swatch">
                  <input type="checkbox" name="color" value={color.name.toLowerCase()} />
                  <span 
                    className="color-swatch__circle"
                    style={{ 
                      backgroundColor: color.hex,
                      backgroundImage: color.pattern ? 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h10v10H0zM10 10h10v10H10z\' fill=\'%23fff\' opacity=\'.1\'/%3E%3C/svg%3E")' : undefined
                    }}
                    title={color.name}
                  />
                </label>
              ))}
            </div>
          </div>
        </details>
      )}

      {/* Rush Delivery Available - 保持不变（非商品属性） */}
      <details className="filter-section" open>
        <summary className="filter-section__title">
          Rush Delivery Available
          <span className="filter-toggle-icon">−</span>
        </summary>
        <div className="filter-section__body">
          {RUSH_DELIVERY_OPTIONS.map((option) => (
            <label key={option.days} className="filter-checkbox">
              <input type="checkbox" name="rushDelivery" value={option.days} />
              <span className="filter-checkbox__label">
                {option.days}
                <span className="rush-badge">
                  {option.icon && <span>{option.icon}</span>}
                  {option.label}
                </span>
              </span>
            </label>
          ))}
        </div>
      </details>

      {/* [2025-01-27 17:00:00] 动态品牌筛选 */}
      {filterOptions.brands.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Brands
            <span className="filter-toggle-icon">−</span>
          </summary>
          <div className="filter-section__body">
            {filterOptions.brands.slice(0, 7).map((brand) => (
              <label key={brand.slug || brand.name} className="filter-checkbox">
                <input type="checkbox" name="brand" value={brand.name} />
                <span className="filter-checkbox__label">
                  {brand.name} <span className="filter-count">({brand.count})</span>
                </span>
              </label>
            ))}
            {filterOptions.brands.length > 7 && (
              <button type="button" className="filter-show-more">Show more</button>
            )}
          </div>
        </details>
      )}

      {/* [2025-01-27 17:00:00] 动态Material筛选（目前返回空数组，暂不显示） */}
      {filterOptions.material.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Material
            <span className="filter-toggle-icon">−</span>
          </summary>
          <div className="filter-section__body">
            {filterOptions.material.map((option) => (
              <label key={option.name} className="filter-checkbox">
                <input type="checkbox" name="material" value={option.name.toLowerCase().replace(/\s+/g, '-')} />
                <span className="filter-checkbox__label">
                  {option.name} <span className="filter-count">({option.count})</span>
                </span>
              </label>
            ))}
            <button type="button" className="filter-show-more">Show more</button>
          </div>
        </details>
      )}

      {/* [2025-01-27 17:00:00] 动态Type筛选（目前返回空数组，暂不显示） */}
      {filterOptions.type.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Type
            <span className="filter-toggle-icon">−</span>
          </summary>
          <div className="filter-section__body">
            {filterOptions.type.map((option) => (
              <label key={option.name} className="filter-checkbox">
                <input type="checkbox" name="type" value={option.name.toLowerCase()} />
                <span className="filter-checkbox__label">
                  {option.name} <span className="filter-count">({option.count})</span>
                </span>
              </label>
            ))}
          </div>
        </details>
      )}

      {/* [2025-01-27 17:00:00] 动态尺寸筛选 */}
      {filterOptions.sizes.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Sizes
            <span className="filter-toggle-icon">−</span>
          </summary>
          <div className="filter-section__body">
            {filterOptions.sizes.map((option) => (
              <label key={option.name} className="filter-checkbox">
                <input type="checkbox" name="size" value={option.name} />
                <span className="filter-checkbox__label">
                  {option.name} <span className="filter-count">({option.count})</span>
                </span>
              </label>
            ))}
          </div>
        </details>
      )}

      {/* [2025-01-27 17:00:00] 动态Style筛选（目前返回空数组，暂不显示） */}
      {filterOptions.style.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Style
            <span className="filter-toggle-icon">−</span>
          </summary>
          <div className="filter-section__body">
            {filterOptions.style.map((option) => (
              <label key={option.name} className="filter-checkbox">
                <input type="checkbox" name="style" value={option.name.toLowerCase()} />
                <span className="filter-checkbox__label">
                  {option.name} <span className="filter-count">({option.count})</span>
                </span>
              </label>
            ))}
          </div>
        </details>
      )}

      {/* [2025-01-27 17:00:00] 动态Neckline筛选（目前返回空数组，暂不显示） */}
      {filterOptions.neckline.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Neckline
            <span className="filter-toggle-icon">−</span>
          </summary>
          <div className="filter-section__body">
            {filterOptions.neckline.map((option) => (
              <label key={option.name} className="filter-checkbox">
                <input type="checkbox" name="neckline" value={option.name.toLowerCase().replace(/\s+/g, '-')} />
                <span className="filter-checkbox__label">
                  {option.name} <span className="filter-count">({option.count})</span>
                </span>
              </label>
            ))}
          </div>
        </details>
      )}

      {/* [2025-01-27 17:00:00] 动态Product Features筛选（目前返回空数组，暂不显示） */}
      {filterOptions.features.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Product Features
            <span className="filter-toggle-icon">−</span>
          </summary>
          <div className="filter-section__body">
            {filterOptions.features.map((option) => (
              <label key={option.name} className="filter-checkbox">
                <input type="checkbox" name="feature" value={option.name.toLowerCase().replace(/\s+/g, '-')} />
                <span className="filter-checkbox__label">
                  {option.name} <span className="filter-count">({option.count})</span>
                </span>
              </label>
            ))}
            <button type="button" className="filter-show-more">Show more</button>
          </div>
        </details>
      )}

      {/* [2025-01-27 17:00:00] 动态价格筛选 */}
      {filterOptions.priceRanges.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Price
            <span className="filter-toggle-icon">−</span>
          </summary>
          <div className="filter-section__body">
            {filterOptions.priceRanges.map((option) => (
              <label key={option.name} className="filter-checkbox">
                <input type="checkbox" name="price" value={option.name} />
                <span className="filter-checkbox__label">
                  {option.name} <span className="filter-count">({option.count})</span>
                </span>
              </label>
            ))}
          </div>
        </details>
      )}
    </>
  );
}

// [2025-01-27 17:00:00] 默认导出以便 dynamic import 使用
export default DynamicFilters;

