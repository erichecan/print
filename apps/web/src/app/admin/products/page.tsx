'use client';

/**
 * Admin Products Page
 * [2025-11-11 23:24:02] 后台商品列表页
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { adminProductsApi, AdminProductSummary } from '@/lib/api';

type ProductFilters = {
  page: number;
  search: string;
  status: 'all' | 'active' | 'inactive';
};

const initialFilters: ProductFilters = {
  page: 1,
  search: '',
  status: 'all',
};

export default function AdminProductsPage() {
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [searchInput, setSearchInput] = useState('');

  const swrKey = useMemo(() => ['admin-products', filters], [filters]);

  const { data, isLoading, mutate } = useSWR(
    swrKey,
    ([, params]: [string, ProductFilters]) =>
      adminProductsApi.list({
        page: params.page,
        search: params.search || undefined,
        status: params.status === 'all' ? undefined : params.status,
      })
  ); // [2025-11-11 06:10:58] 显式标注 SWR fetcher 的参数类型

  const products = data?.data ?? [];
  const pagination = data?.pagination;

  const handleStatusChange = async (product: AdminProductSummary) => {
    await adminProductsApi.updateStatus(product.id, !product.isActive);
    mutate();
  };

  const handleArchive = async (product: AdminProductSummary) => {
    const confirmed = window.confirm(
      `确定要将商品「${product.name}」下架并归档吗？`
    );
    if (!confirmed) return;
    await adminProductsApi.archive(product.id);
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
    const value = event.target.value as ProductFilters['status'];
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
          <h1>商品管理</h1>
          <p>管理商品上架状态、库存与定价。</p>
        </div>
        <Link href="/admin/products/new" className="primary-btn">
          新建商品
        </Link>
      </header>

      <section className="filters">
        <form className="search-form" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="搜索名称 / SKU / 描述"
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
              <option value="active">已上架</option>
              <option value="inactive">已下架</option>
            </select>
          </label>
        </div>
      </section>

      <div className="table-card">
        {isLoading ? (
          <div className="placeholder">正在加载商品列表...</div>
        ) : products.length === 0 ? (
          <div className="placeholder">暂无商品，请先创建。</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>商品名称</th>
                <th>SKU</th>
                <th>分类</th>
                <th>价格</th>
                <th>库存</th>
                <th>状态</th>
                <th>更新日期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="product-cell">
                      <span className="name">{product.name}</span>
                      <span className="slug">/{product.slug}</span>
                    </div>
                  </td>
                  <td>{product.sku}</td>
                  <td>{product.category?.name || '-'}</td>
                  <td>${Number(product.salePrice || product.basePrice).toFixed(2)}</td>
                  <td>{product.stockQuantity}</td>
                  <td>
                    <span
                      className={`status-badge ${
                        product.isActive ? 'active' : 'inactive'
                      }`}
                    >
                      {product.isActive ? '上架' : '下架'}
                    </span>
                  </td>
                  <td>{product.updatedAt ? new Date(product.updatedAt).toLocaleString() : '-'}</td>
                  <td>
                    <div className="actions">
                      <Link href={`/admin/products/${product.id}`} className="link">
                        编辑
                      </Link>
                      <button
                        type="button"
                        className="link"
                        onClick={() => handleStatusChange(product)}
                      >
                        {product.isActive ? '下架' : '上架'}
                      </button>
                      <button
                        type="button"
                        className="link danger"
                        onClick={() => handleArchive(product)}
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
          min-width: 260px;
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
        .product-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .product-cell .name {
          font-weight: 600;
        }
        .product-cell .slug {
          font-size: 12px;
          color: #94a3b8;
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
          th:nth-child(4),
          td:nth-child(4),
          th:nth-child(6),
          td:nth-child(6) {
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


