/**
 * Dynamic Filters Component
* 动态筛选器组件，从API获取筛选选项和数量
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
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

// 预设颜色列表（用于颜色选择器）
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.get('search') || '';

// 实时筛选：当用户点击复选框时立即更新 URL
  const handleFilterChange = useCallback((filterName: string, value: string, checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());

    // 获取当前筛选值数组
    const currentValues = params.get(filterName)?.split(',') || [];

    if (checked) {
      // 添加筛选值
      if (!currentValues.includes(value)) {
        currentValues.push(value);
      }
    } else {
      // 移除筛选值
      const index = currentValues.indexOf(value);
      if (index > -1) {
        currentValues.splice(index, 1);
      }
    }

    // 更新 URL 参数
    if (currentValues.length > 0) {
      params.set(filterName, currentValues.join(','));
    } else {
      params.delete(filterName);
    }

    // 重置到第一页
    params.delete('page');

    // 更新 URL（实时筛选）
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

// 检查筛选值是否已选中
  const isFilterChecked = useCallback((filterName: string, value: string) => {
    const currentValues = searchParams.get(filterName)?.split(',') || [];
    return currentValues.includes(value);
  }, [searchParams]);

// 从API获取筛选选项
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

// 合并API返回的颜色和预设颜色，显示数量
// 始终返回所有颜色，即使数量为0
  const getColorOptions = () => {
    if (!filterOptions) return COLOR_FAMILIES.map(c => ({ ...c, count: 0 }));

    const colorMap = new Map(
      (filterOptions.colors || []).map(c => [c.name.toLowerCase(), c.count || 0])
    );

// 使用后端返回的颜色列表（如果存在），否则使用预设颜色列表
    const colorList = filterOptions.colors && filterOptions.colors.length > 0
      ? filterOptions.colors.map(c => ({
        name: c.name,
        hex: c.hex || COLOR_FAMILIES.find(cf => cf.name.toLowerCase() === c.name.toLowerCase())?.hex || '#CCCCCC',
        pattern: COLOR_FAMILIES.find(cf => cf.name.toLowerCase() === c.name.toLowerCase())?.pattern || false,
        count: c.count || 0,
      }))
      : COLOR_FAMILIES.map(color => ({
        ...color,
        count: colorMap.get(color.name.toLowerCase()) || 0,
      }));

    return colorList;
  };

// 获取分类树（一级和二级）
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

// 即使加载失败，也显示固定的筛选选项（颜色等）
  // 如果出错，记录错误但不阻止渲染
  if (error) {
    console.error('[DynamicFilters] Error loading filters:', error);
  }

  const categoryTree = filterOptions ? getCategoryTree() : [];
const colorOptions = getColorOptions(); // 始终返回颜色列表，即使 filterOptions 为空

// 安全访问 filterOptions 的辅助函数，避免 undefined 错误
  const safeFilterOptions = filterOptions || {
    fit: [],
    decoration: [],
    material: [],
    type: [],
    style: [],
    neckline: [],
    features: [],
    sizes: [],
    priceRanges: [],
    rushDelivery: [],
    brands: [],
  };

  return (
    <>
{/* Categories are now handled by SidebarGrouped component at the top of sidebar */}
      {/* {categoryTree.length > 0 && ( ... )} */}

{/* 动态Fit筛选（目前返回空数组，暂不显示） */}
{/* 使用 safeFilterOptions 避免 undefined 错误 */}
      {safeFilterOptions.fit.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Fit
            <span className="filter-toggle-icon"></span>
          </summary>
          <div className="filter-section__body">
            {safeFilterOptions.fit.map((option) => {
              const value = option.name.toLowerCase().replace(/\s+/g, '-');
              return (
                <label key={option.name} className="filter-checkbox">
                  <input
                    type="checkbox"
                    name="fit"
                    value={value}
                    checked={isFilterChecked('fit', value)}
                    onChange={(e) => handleFilterChange('fit', value, e.target.checked)}
                  />
                  <span className="filter-checkbox__label">
                    {option.name} <span className="filter-count">({option.count})</span>
                  </span>
                </label>
              );
            })}
          </div>
        </details>
      )}

{/* 动态Decoration筛选（目前返回空数组，暂不显示） */}
{/* 使用 safeFilterOptions 避免 undefined 错误 */}
      {safeFilterOptions.decoration.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Decoration
            <span className="filter-toggle-icon"></span>
          </summary>
          <div className="filter-section__body">
            {safeFilterOptions.decoration.map((option) => {
              const value = option.name.toLowerCase();
              return (
                <label key={option.name} className="filter-checkbox">
                  <input
                    type="checkbox"
                    name="decoration"
                    value={value}
                    checked={isFilterChecked('decoration', value)}
                    onChange={(e) => handleFilterChange('decoration', value, e.target.checked)}
                  />
                  <span className="filter-checkbox__label">
                    {option.name} <span className="filter-count">({option.count})</span>
                  </span>
                </label>
              );
            })}
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
            <input
              type="checkbox"
              name="multiAddress"
              checked={searchParams.get('multiAddress') === 'true'}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                if (e.target.checked) {
                  params.set('multiAddress', 'true');
                } else {
                  params.delete('multiAddress');
                }
                params.delete('page');
                router.push(`${pathname}?${params.toString()}`);
              }}
            />
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
            <input
              type="checkbox"
              name="noMinimum"
              checked={searchParams.get('noMinimum') === 'true'}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                if (e.target.checked) {
                  params.set('noMinimum', 'true');
                } else {
                  params.delete('noMinimum');
                }
                params.delete('page');
                router.push(`${pathname}?${params.toString()}`);
              }}
            />
            <span className="filter-toggle__slider">
              <span className="filter-toggle__label filter-toggle__label--no">No</span>
              <span className="filter-toggle__label filter-toggle__label--yes">Yes</span>
            </span>
          </label>
        </div>
      </div>

{/* 动态颜色选择 */}
{/* 始终显示颜色筛选，即使数量为0也显示 */}
      <details className="filter-section" open>
        <summary className="filter-section__title">
          Color Family
          <span className="filter-toggle-icon"></span>
        </summary>
        <div className="filter-section__body">
          <div className="color-grid">
            {colorOptions.map((color) => {
              const value = color.name.toLowerCase();
              return (
                <label key={color.name} className="color-swatch">
                  <input
                    type="checkbox"
                    name="color"
                    value={value}
                    checked={isFilterChecked('color', value)}
                    onChange={(e) => handleFilterChange('color', value, e.target.checked)}
                  />
                  <span
                    className="color-swatch__circle"
                    style={{
                      backgroundColor: color.hex,
                      backgroundImage: color.pattern ? 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h10v10H0zM10 10h10v10H10z\' fill=\'%23fff\' opacity=\'.1\'/%3E%3C/svg%3E")' : undefined
                    }}
                    title={color.name}
                  />
                </label>
              );
            })}
          </div>
        </div>
      </details>

      {/* Rush Delivery Available - 使用后端返回的数据 */}
{/* 始终显示 Rush Delivery 筛选，即使数量为0 */}
      <details className="filter-section" open>
        <summary className="filter-section__title">
          Rush Delivery Available
          <span className="filter-toggle-icon">−</span>
        </summary>
        <div className="filter-section__body">
{/* 使用 safeFilterOptions 避免 undefined 错误 */}
          {(safeFilterOptions.rushDelivery && safeFilterOptions.rushDelivery.length > 0
            ? safeFilterOptions.rushDelivery
            : RUSH_DELIVERY_OPTIONS.map(opt => ({ name: opt.days, label: opt.label, count: 0 }))
          ).map((option) => (
            <label key={option.name} className="filter-checkbox">
              <input
                type="checkbox"
                name="rushDelivery"
                value={option.name}
                checked={isFilterChecked('rushDelivery', option.name)}
                onChange={(e) => handleFilterChange('rushDelivery', option.name, e.target.checked)}
              />
              <span className="filter-checkbox__label">
                {option.name}
                <span className="rush-badge">
                  {option.name === '3 days' && <span>⚡</span>}
                  {option.label || 'Rush'}
                </span>
                <span className="filter-count"> ({option.count || 0})</span>
              </span>
            </label>
          ))}
        </div>
      </details>

{/* 动态品牌筛选 */}
{/* 始终显示品牌筛选，即使数量为0也显示 */}
{/* 使用 safeFilterOptions 避免 undefined 错误 */}
      {safeFilterOptions.brands && safeFilterOptions.brands.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Brands
            <span className="filter-toggle-icon"></span>
          </summary>
          <div className="filter-section__body">
            {safeFilterOptions.brands.slice(0, 7).map((brand) => (
              <label key={brand.slug || brand.name} className="filter-checkbox">
                <input
                  type="checkbox"
                  name="brand"
                  value={brand.name}
                  checked={isFilterChecked('brand', brand.name)}
                  onChange={(e) => handleFilterChange('brand', brand.name, e.target.checked)}
                />
                <span className="filter-checkbox__label">
                  {brand.name} <span className="filter-count">({brand.count || 0})</span>
                </span>
              </label>
            ))}
            {safeFilterOptions.brands.length > 7 && (
              <button type="button" className="filter-show-more">Show more</button>
            )}
          </div>
        </details>
      )}

{/* 动态Material筛选（目前返回空数组，暂不显示） */}
{/* 使用 safeFilterOptions 避免 undefined 错误 */}
      {safeFilterOptions.material.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Material
            <span className="filter-toggle-icon"></span>
          </summary>
          <div className="filter-section__body">
            {safeFilterOptions.material.map((option) => {
              const value = option.name.toLowerCase().replace(/\s+/g, '-');
              return (
                <label key={option.name} className="filter-checkbox">
                  <input
                    type="checkbox"
                    name="material"
                    value={value}
                    checked={isFilterChecked('material', value)}
                    onChange={(e) => handleFilterChange('material', value, e.target.checked)}
                  />
                  <span className="filter-checkbox__label">
                    {option.name} <span className="filter-count">({option.count})</span>
                  </span>
                </label>
              );
            })}
            <button type="button" className="filter-show-more">Show more</button>
          </div>
        </details>
      )}

{/* 动态Type筛选（目前返回空数组，暂不显示） */}
{/* 使用 safeFilterOptions 避免 undefined 错误 */}
      {safeFilterOptions.type.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Type
            <span className="filter-toggle-icon"></span>
          </summary>
          <div className="filter-section__body">
            {safeFilterOptions.type.map((option) => {
              const value = option.name.toLowerCase();
              return (
                <label key={option.name} className="filter-checkbox">
                  <input
                    type="checkbox"
                    name="type"
                    value={value}
                    checked={isFilterChecked('type', value)}
                    onChange={(e) => handleFilterChange('type', value, e.target.checked)}
                  />
                  <span className="filter-checkbox__label">
                    {option.name} <span className="filter-count">({option.count})</span>
                  </span>
                </label>
              );
            })}
          </div>
        </details>
      )}

{/* 动态尺寸筛选 */}
{/* 使用 safeFilterOptions 避免 undefined 错误 */}
      {safeFilterOptions.sizes.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Sizes
            <span className="filter-toggle-icon"></span>
          </summary>
          <div className="filter-section__body">
            {safeFilterOptions.sizes.map((option) => (
              <label key={option.name} className="filter-checkbox">
                <input
                  type="checkbox"
                  name="size"
                  value={option.name}
                  checked={isFilterChecked('size', option.name)}
                  onChange={(e) => handleFilterChange('size', option.name, e.target.checked)}
                />
                <span className="filter-checkbox__label">
                  {option.name} <span className="filter-count">({option.count})</span>
                </span>
              </label>
            ))}
          </div>
        </details>
      )}

{/* 动态Style筛选（目前返回空数组，暂不显示） */}
{/* 使用 safeFilterOptions 避免 undefined 错误 */}
      {safeFilterOptions.style.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Style
            <span className="filter-toggle-icon"></span>
          </summary>
          <div className="filter-section__body">
            {safeFilterOptions.style.map((option) => {
              const value = option.name.toLowerCase();
              return (
                <label key={option.name} className="filter-checkbox">
                  <input
                    type="checkbox"
                    name="style"
                    value={value}
                    checked={isFilterChecked('style', value)}
                    onChange={(e) => handleFilterChange('style', value, e.target.checked)}
                  />
                  <span className="filter-checkbox__label">
                    {option.name} <span className="filter-count">({option.count})</span>
                  </span>
                </label>
              );
            })}
          </div>
        </details>
      )}

{/* 动态Neckline筛选（目前返回空数组，暂不显示） */}
{/* 使用 safeFilterOptions 避免 undefined 错误 */}
      {safeFilterOptions.neckline.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Neckline
            <span className="filter-toggle-icon"></span>
          </summary>
          <div className="filter-section__body">
            {safeFilterOptions.neckline.map((option) => {
              const value = option.name.toLowerCase().replace(/\s+/g, '-');
              return (
                <label key={option.name} className="filter-checkbox">
                  <input
                    type="checkbox"
                    name="neckline"
                    value={value}
                    checked={isFilterChecked('neckline', value)}
                    onChange={(e) => handleFilterChange('neckline', value, e.target.checked)}
                  />
                  <span className="filter-checkbox__label">
                    {option.name} <span className="filter-count">({option.count})</span>
                  </span>
                </label>
              );
            })}
          </div>
        </details>
      )}

{/* 动态Product Features筛选（目前返回空数组，暂不显示） */}
{/* 使用 safeFilterOptions 避免 undefined 错误 */}
      {safeFilterOptions.features.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Product Features
            <span className="filter-toggle-icon"></span>
          </summary>
          <div className="filter-section__body">
            {safeFilterOptions.features.map((option) => {
              const value = option.name.toLowerCase().replace(/\s+/g, '-');
              return (
                <label key={option.name} className="filter-checkbox">
                  <input
                    type="checkbox"
                    name="feature"
                    value={value}
                    checked={isFilterChecked('feature', value)}
                    onChange={(e) => handleFilterChange('feature', value, e.target.checked)}
                  />
                  <span className="filter-checkbox__label">
                    {option.name} <span className="filter-count">({option.count})</span>
                  </span>
                </label>
              );
            })}
            <button type="button" className="filter-show-more">Show more</button>
          </div>
        </details>
      )}

{/* 动态价格筛选 */}
{/* 使用 safeFilterOptions 避免 undefined 错误 */}
      {safeFilterOptions.priceRanges.length > 0 && (
        <details className="filter-section" open>
          <summary className="filter-section__title">
            Price
            <span className="filter-toggle-icon"></span>
          </summary>
          <div className="filter-section__body">
            {safeFilterOptions.priceRanges.map((option) => (
              <label key={option.name} className="filter-checkbox">
                <input
                  type="checkbox"
                  name="price"
                  value={option.name}
                  checked={isFilterChecked('price', option.name)}
                  onChange={(e) => handleFilterChange('price', option.name, e.target.checked)}
                />
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

// 默认导出以便 dynamic import 使用
export default DynamicFilters;

