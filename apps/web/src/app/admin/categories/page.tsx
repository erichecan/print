'use client';

/**
 * Admin Categories Page
 * [2025-11-11 23:25:24] 后台分类列表页
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  adminCategoriesApi,
  AdminCategorySummary,
} from '@/lib/api';

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
    <div className="admin-section">
      <header className="page-header">
        <div>
          <h1>分类管理</h1>
          <p>维护商品分类结构与展示顺序。</p>
        </div>
        <Link href="/admin/categories/new" className="primary-btn">
          新建分类
        </Link>
      </header>

      <section className="filters">
        <form className="search-form" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="搜索分类名称/描述"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <button type="submit">搜索</button>
        </form>
        <div className="filter-selects">
          <label>
            状态
            <select
              value={filters.status}
              onChange={handleStatusFilterChange}
            >
              <option value="all">全部</option>
              <option value="active">启用</option>
              <option value="inactive">禁用</option>
            </select>
          </label>
        </div>
      </section>

      <div className="table-card">
        {isLoading ? (
          <div className="placeholder">正在加载分类列表...</div>
        ) : categories.length === 0 ? (
          <div className="placeholder">暂无分类，立即创建一个吧。</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>分类名称</th>
                <th>Slug</th>
                <th>父级分类</th>
                <th>排序</th>
                <th>商品数量</th>
                <th>状态</th>
                <th>更新日期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>{category.slug}</td>
                  <td>{category.parent?.name || '-'}</td>
                  <td>{category.sortOrder}</td>
                  <td>{category._count?.products ?? 0}</td>
                  <td>
                    <span
                      className={`status-badge ${
                        category.isActive ? 'active' : 'inactive'
                      }`}
                    >
                      {category.isActive ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td>{new Date(category.updatedAt).toLocaleString()}</td>
                  <td>
                    <div className="actions">
                      <Link href={`/admin/categories/${category.id}`} className="link">
                        编辑
                      </Link>
                      <button
                        type="button"
                        className="link"
                        onClick={() => handleStatusChange(category)}
                      >
                        {category.isActive ? '禁用' : '启用'}
                      </button>
                      <button
                        type="button"
                        className="link danger"
                        onClick={() => handleArchive(category)}
                      >
                        归档
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: pagination.totalPages }).map((_, index) => {
            const pageNumber = index + 1;
            return (
              <button
                key={pageNumber}
                type="button"
                className={`page-btn${
                  pageNumber === filters.page ? ' active' : ''
                }`}
                onClick={() => goToPage(pageNumber)}
              >
                {pageNumber}
              </button>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .admin-section {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .page-header h1 {
          margin: 0;
          font-size: 26px;
        }
        .page-header p {
          margin: 4px 0 0;
          color: #64748b;
        }
        .primary-btn {
          padding: 10px 18px;
          background: #ff1f3d;
          border-radius: 10px;
          color: #fff;
          font-weight: 600;
          text-decoration: none;
        }
        .filters {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .search-form {
          display: flex;
          gap: 8px;
        }
        .search-form input {
          min-width: 240px;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5f5;
        }
        .search-form button {
          padding: 10px 16px;
          border-radius: 8px;
          border: none;
          background: #1f2937;
          color: #fff;
          font-weight: 600;
          cursor: pointer;
        }
        .filter-selects {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .filter-selects select {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5f5;
        }
        .table-card {
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        thead {
          background: #f8fafc;
        }
        th,
        td {
          padding: 14px 16px;
          font-size: 14px;
          border-bottom: 1px solid #e2e8f0;
          text-align: left;
        }
        tbody tr:hover {
          background: #f9fafb;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 64px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
        }
        .status-badge.active {
          background: rgba(16, 185, 129, 0.12);
          color: #059669;
        }
        .status-badge.inactive {
          background: rgba(148, 163, 184, 0.12);
          color: #475569;
        }
        .actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .link {
          background: none;
          border: none;
          color: #2563eb;
          cursor: pointer;
          text-decoration: none;
          font-weight: 600;
        }
        .link.danger {
          color: #ef4444;
        }
        .placeholder {
          padding: 48px;
          text-align: center;
          color: #64748b;
        }
        .pagination {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        .page-btn {
          min-width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid #cbd5f5;
          background: #fff;
          cursor: pointer;
        }
        .page-btn.active {
          background: #1f2937;
          color: #fff;
          border-color: #1f2937;
        }
        @media (max-width: 1024px) {
          th:nth-child(3),
          td:nth-child(3),
          th:nth-child(5),
          td:nth-child(5) {
            display: none;
          }
        }
        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .filters {
            flex-direction: column;
            align-items: stretch;
          }
          .search-form {
            width: 100%;
          }
          .search-form input {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}


