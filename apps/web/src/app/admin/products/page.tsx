'use client';

/**
 * Admin Products Page
 * [2025-11-15 13:10:00] 完整还原 prototype/admin/admin/products.html 布局与交互
 * [2025-11-15 14:32:05] 增强：后端筛选 + 批量操作 + 分类下拉真实数据
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  adminProductsApi,
  AdminProductSummary,
  adminCategoriesApi,
  AdminCategorySummary,
} from '@/lib/api';

type RemoteFilters = {
  page: number;
  search: string;
  status: 'all' | 'active' | 'inactive';
  categoryId?: string;
};

type StatusFilter = 'all' | 'active' | 'out_of_stock' | 'archived';

const remoteDefaults: RemoteFilters = {
  page: 1,
  search: '',
  status: 'all',
};

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'archived', label: 'Archived' },
];

export default function AdminProductsPage() {
  const [remoteFilters, setRemoteFilters] = useState<RemoteFilters>(remoteDefaults);
  const [searchDraft, setSearchDraft] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [processingBulk, setProcessingBulk] = useState(false);

  const swrKey = useMemo(() => ['admin-products', remoteFilters], [remoteFilters]);

  const { data, isLoading, error, mutate } = useSWR(swrKey, ([, params]) =>
    adminProductsApi.list({
      page: params.page,
      search: params.search || undefined,
      status: params.status === 'all' ? undefined : params.status,
      categoryId: params.categoryId || undefined,
    })
  );

  const { data: categoryResponse } = useSWR('admin-product-categories', () =>
    adminCategoriesApi.list({ page: 1, limit: 200, status: 'active' })
  );

  const categoryOptions: AdminCategorySummary[] = categoryResponse?.data ?? [];

  const products = data?.data ?? [];
  const pagination = data?.pagination;

  const filteredProducts = useMemo(() => {
    if (statusFilter === 'out_of_stock') {
      return products.filter((product) => (product.stockQuantity ?? 0) === 0);
    }
    return products;
  }, [products, statusFilter]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const allowedIds = new Set(filteredProducts.map((product) => product.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (allowedIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [filteredProducts]);

  const allSelected =
    filteredProducts.length > 0 && filteredProducts.every((product) => selectedIds.has(product.id));

  const handleToggleAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredProducts.map((product) => product.id)));
  };

  const handleToggleOne = (product: AdminProductSummary, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(product.id);
      } else {
        next.delete(product.id);
      }
      return next;
    });
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRemoteFilters((prev) => ({
      ...prev,
      page: 1,
      search: searchDraft.trim(),
    }));
  };

  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    setRemoteFilters((prev) => ({
      ...prev,
      page: 1,
      status: value === 'active' ? 'active' : value === 'archived' ? 'inactive' : 'all',
    }));
  };

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value);
    setRemoteFilters((prev) => ({
      ...prev,
      page: 1,
      categoryId: value || undefined,
    }));
  };

  const goToPage = (page: number) => {
    setRemoteFilters((prev) => ({
      ...prev,
      page,
    }));
  };

  const handleStatusChange = async (product: AdminProductSummary) => {
    await adminProductsApi.updateStatus(product.id, !product.isActive);
    mutate();
  };

  const handleArchive = async (product: AdminProductSummary) => {
    const confirmed = window.confirm(`确定要将商品「${product.name}」下架并归档吗？`);
    if (!confirmed) {
      return;
    }
    await adminProductsApi.archive(product.id);
    mutate();
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) {
      return;
    }
    setProcessingBulk(true);
    try {
      const requests: Array<Promise<unknown>> = [];
      selectedIds.forEach((id) => {
        if (bulkAction === 'archive') {
          requests.push(adminProductsApi.archive(id));
        } else if (bulkAction === 'activate') {
          requests.push(adminProductsApi.updateStatus(id, true));
        } else if (bulkAction === 'deactivate') {
          requests.push(adminProductsApi.updateStatus(id, false));
        }
      });
      await Promise.all(requests);
      setSelectedIds(new Set());
      setBulkAction('');
      mutate();
    } catch (apiError) {
      console.error('[AdminProductsPage] bulk action error', apiError);
      alert((apiError as Error).message || 'Bulk action failed');
    } finally {
      setProcessingBulk(false);
    }
  };

  const formatCurrency = (value?: string | number | null) => {
    const numeric = Number(value ?? 0);
    return `$${numeric.toFixed(2)}`;
  };

  const statusLabel = (product: AdminProductSummary) => {
    if (!product.isActive) {
      return 'Archived';
    }
    if ((product.stockQuantity ?? 0) === 0) {
      return 'Out of Stock';
    }
    return 'Active';
  };

  const statusClass = (product: AdminProductSummary) => {
    if (!product.isActive) {
      return 'badge badge-pending';
    }
    if ((product.stockQuantity ?? 0) === 0) {
      return 'badge badge-warning';
    }
    return 'badge badge-success';
  };

  const totalPages = pagination?.totalPages ?? 1;
  const canPrev = remoteFilters.page > 1;
  const canNext = remoteFilters.page < totalPages;

  return (
    <div style={{ marginTop: 24 }}>
      <div className="admin-page-header">
        <div>
          <h1 data-i18n="products">Products</h1>
          <p className="text-muted">Manage product catalog, status, inventory, and pricing</p>
        </div>
        <div className="admin-btn-group">
          <Link href="/admin/products/new" className="btn btn--primary" data-i18n="newProduct">
            + New Product
          </Link>
        </div>
      </div>

      <div className="admin-filters admin-filters--wrap">
        <form className="admin-search admin-search-form" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            placeholder="Search products..."
            aria-label="Search products"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            data-field="searchQuery"
          />
          <button type="submit" className="btn btn--outline btn--xs">
            Search
          </button>
        </form>
        <select
          value={categoryFilter}
          onChange={(event) => handleCategoryFilterChange(event.target.value)}
          aria-label="Filter by category"
          data-field="categoryFilter"
        >
          <option value="">All Categories</option>
          {categoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => handleStatusFilterChange(event.target.value as StatusFilter)}
          aria-label="Filter by status"
          data-field="statusFilter"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="bulk-actions">
          <span>
            Selected:&nbsp;<strong>{selectedIds.size}</strong>
          </span>
          <select
            value={bulkAction}
            onChange={(event) => setBulkAction(event.target.value)}
            disabled={selectedIds.size === 0 || processingBulk}
          >
            <option value="">Bulk action…</option>
            <option value="activate">Activate</option>
            <option value="deactivate">Disable</option>
            <option value="archive">Archive</option>
          </select>
          <button
            type="button"
            className="btn btn--outline btn--xs"
            onClick={handleBulkAction}
            disabled={!bulkAction || selectedIds.size === 0 || processingBulk}
          >
            Apply
          </button>
        </div>
      </div>

      <div className="admin-table-wrapper" data-api="/api/admin/products" data-method="GET">
        {isLoading ? (
          <div className="admin-table-placeholder">Loading products…</div>
        ) : error ? (
          <div className="admin-table-placeholder error">Failed to load products.</div>
        ) : filteredProducts.length === 0 ? (
          <div className="admin-table-placeholder">No products match current filters.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Select all products"
                    checked={allSelected}
                    onChange={(event) => handleToggleAll(event.target.checked)}
                  />
                </th>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Inventory</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} data-entity="product" data-id={product.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${product.name}`}
                      checked={selectedIds.has(product.id)}
                      onChange={(event) => handleToggleOne(product, event.target.checked)}
                    />
                  </td>
                  <td>
                    <div className="product-listing">
                      <div className="product-thumbnail" aria-hidden="true">
                        {product.primaryImage?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.primaryImage.url} alt={product.primaryImage.alt || ''} />
                        ) : (
                          <div className="placeholder" />
                        )}
                      </div>
                      <div>
                        <div className="product-name" data-field="name">
                          {product.name}
                        </div>
                        <div className="product-slug" data-field="slug">
                          /{product.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td data-field="sku">{product.sku || '—'}</td>
                  <td data-field="category">{product.category?.name || 'Unassigned'}</td>
                  <td data-field="price">{formatCurrency(product.salePrice ?? product.basePrice)}</td>
                  <td data-field="inventory">{product.stockQuantity ?? 0}</td>
                  <td>
                    <span className={statusClass(product)} data-field="status">
                      {statusLabel(product)}
                    </span>
                  </td>
                  <td data-field="updatedAt">
                    {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <div className="actions-dropdown">
                      <button type="button" className="actions-dropdown-btn" aria-haspopup="menu" aria-expanded="false">
                        ⋯
                      </button>
                      <div className="actions-dropdown-menu" role="menu">
                        <Link href={`/admin/products/${product.id}`} role="menuitem">
                          Edit
                        </Link>
                        <button type="button" role="menuitem" onClick={() => handleStatusChange(product)}>
                          {product.isActive ? 'Disable' : 'Activate'}
                        </button>
                        <button type="button" role="menuitem" onClick={() => handleArchive(product)}>
                          Archive
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && (
        <div className="admin-pagination">
          <button type="button" disabled={!canPrev} onClick={() => canPrev && goToPage(remoteFilters.page - 1)}>
            Previous
          </button>
          {Array.from({ length: totalPages }).map((_, index) => {
            const pageNumber = index + 1;
            return (
              <button
                key={pageNumber}
                type="button"
                className={pageNumber === remoteFilters.page ? 'active' : undefined}
                onClick={() => goToPage(pageNumber)}
              >
                {pageNumber}
              </button>
            );
          })}
          <button type="button" disabled={!canNext} onClick={() => canNext && goToPage(remoteFilters.page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
