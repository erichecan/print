'use client';

/**
 * Admin Categories Page
 * [2025-11-11 23:25:24] 后台分类列表页
 * [2025-11-15 16:25:00] 还原 prototype/admin/admin/categories.html 卡片布局
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { adminCategoriesApi, AdminCategorySummary } from '@/lib/api';

type CategoryFilters = {
  page: number;
  search: string;
  status: 'all' | 'active' | 'inactive';
};

const initialFilters: CategoryFilters = {
  page: 1,
  search: '',
  status: 'all',
};

// [2025-11-15 16:25:00] Category icon fallback，确保 UI 与原型一致
const CATEGORY_ICON_MAP: Record<string, string> = {
  tshirt: '👕',
  shirt: '👕',
  hoodie: '🧥',
  hoodies: '🧥',
  hat: '🧢',
  hats: '🧢',
  bag: '🎒',
  bags: '🎒',
  drinkware: '🥤',
  bottle: '🥤',
};

const getCategoryIcon = (name: string) => {
  const key = name.toLowerCase();
  const entry = Object.entries(CATEGORY_ICON_MAP).find(([alias]) => key.includes(alias));
  if (entry) {
    return entry[1];
  }
  return '📁';
};

export default function AdminCategoriesPage() {
  const [filters, setFilters] = useState<CategoryFilters>(initialFilters);
  const [searchInput, setSearchInput] = useState('');

  const swrKey = useMemo(() => ['admin-categories', filters], [filters]);

  const { data, isLoading, mutate } = useSWR(
    swrKey,
    ([, params]: [string, CategoryFilters]) =>
      adminCategoriesApi.list({
        page: params.page,
        search: params.search || undefined,
        status: params.status === 'all' ? undefined : params.status,
      })
  ); // [2025-11-11 06:10:00] 为 SWR fetcher 参数显式声明类型，避免推断为 string

  const categories = data?.data ?? [];
  const pagination = data?.pagination;

  const handleStatusChange = async (category: AdminCategorySummary) => {
    await adminCategoriesApi.update(category.id, { isActive: !category.isActive });
    mutate();
  };

  const handleArchive = async (category: AdminCategorySummary) => {
    const confirmed = window.confirm(`确定归档分类「${category.name}」吗？`);
    if (!confirmed) return;
    await adminCategoriesApi.archive(category.id);
    mutate();
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters((prev) => ({
      ...prev,
      page: 1,
      search: searchInput.trim(),
    }));
  };

  const handleStatusFilterChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = event.target.value as CategoryFilters['status'];
    setFilters((prev) => ({
      ...prev,
      page: 1,
      status: value,
    }));
  };

  const goToPage = (page: number) => {
    setFilters((prev) => ({
      ...prev,
      page,
    }));
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div className="admin-page-header">
        <div>
          <h1 data-i18n="categories">Categories</h1>
          <p className="text-muted">Manage navigation groupings and featured collections</p>
        </div>
        <Link href="/admin/categories/new" className="btn btn--primary">
          + New Category
        </Link>
      </div>

      <div className="admin-toolbar">
        <form className="admin-search admin-search-form" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="Search categories..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <button type="submit" className="btn btn--outline btn--xs">
            Search
          </button>
        </form>
        <select value={filters.status} onChange={handleStatusFilterChange}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {isLoading ? (
        <div className="admin-table-placeholder">Loading categories…</div>
      ) : categories.length === 0 ? (
        <div className="admin-table-placeholder">No categories yet.</div>
      ) : (
        <div className="admin-category-list">
          {categories.map((category) => (
            <article key={category.id} className="admin-category-card">
              <div className="category-meta">
                <div className="category-icon" aria-hidden="true">
                  {getCategoryIcon(category.name)}
                </div>
                <div>
                  <div className="category-name">{category.name}</div>
                  <div className="category-slug">/{category.slug}</div>
                  <div className="category-stats">
                    {(category._count?.products ?? 0).toLocaleString()} products • Sort{' '}
                    {category.sortOrder ?? 0}
                  </div>
                </div>
              </div>
              <div className="category-actions">
                <span className={`badge ${category.isActive ? 'badge-success' : 'badge-pending'}`}>
                  {category.isActive ? 'Active' : 'Inactive'}
                </span>
                <div className="actions-dropdown">
                  <button type="button" className="actions-dropdown-btn" aria-haspopup="menu" aria-expanded="false">
                    ⋯
                  </button>
                  <div className="actions-dropdown-menu" role="menu">
                    <Link href={`/admin/categories/${category.id}`} role="menuitem">
                      Edit
                    </Link>
                    <button type="button" role="menuitem" onClick={() => handleStatusChange(category)}>
                      {category.isActive ? 'Disable' : 'Activate'}
                    </button>
                    <button type="button" role="menuitem" onClick={() => handleArchive(category)} style={{ color: '#EF4444' }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="admin-pagination">
          {Array.from({ length: pagination.totalPages }).map((_, index) => {
            const pageNumber = index + 1;
            return (
              <button
                key={pageNumber}
                type="button"
                className={pageNumber === filters.page ? 'active' : undefined}
                onClick={() => goToPage(pageNumber)}
              >
                {pageNumber}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


