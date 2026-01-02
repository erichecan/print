'use client';

/**
 * Admin Products Page
* 完整还原 prototype/admin/admin/products.html 布局与交互
* 增强：后端筛选 + 批量操作 + 分类下拉真实数据
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
import { useAdminI18n } from '@/contexts/adminI18nContext';
import { useRouter } from 'next/navigation';

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

const statusOptions: Array<{ value: StatusFilter; labelKey: string; fallback: string }> = [
  { value: 'all', labelKey: 'statusFilterAll', fallback: 'All Status' },
  { value: 'active', labelKey: 'statusFilterActive', fallback: 'Active' },
  { value: 'out_of_stock', labelKey: 'statusFilterOutOfStock', fallback: 'Out of Stock' },
  { value: 'archived', labelKey: 'statusFilterArchived', fallback: 'Archived' },
];

export default function AdminProductsPage() {
  const { t } = useAdminI18n();
  const router = useRouter();
  const [remoteFilters, setRemoteFilters] = useState<RemoteFilters>(remoteDefaults);
  const [searchDraft, setSearchDraft] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [processingBulk, setProcessingBulk] = useState(false);

  const swrKey = useMemo(() => ['admin-products', remoteFilters], [remoteFilters]);

  const { data, isLoading, error, mutate } = useSWR(swrKey, ([, params]) => {
    const p = params as RemoteFilters;
    return adminProductsApi.list({
      page: p.page,
      search: p.search || undefined,
      status: p.status === 'all' ? undefined : p.status,
      categoryId: p.categoryId || undefined,
    });
  });

  const { data: categoryResponse } = useSWR('admin-product-categories', () =>
    adminCategoriesApi.list({ page: 1, limit: 200, status: 'active' })
  );

  const categoryOptions: AdminCategorySummary[] = categoryResponse?.data ?? [];

  const products = useMemo(() => data?.data ?? [], [data]);
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

  const handleDelete = async (product: AdminProductSummary) => {
    // Direct delete without confirmation per user request
    try {
      await adminProductsApi.delete(product.id);
      mutate();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) {
      return;
    }
    setProcessingBulk(true);
    try {
      const requests: Array<Promise<unknown>> = [];
      selectedIds.forEach((id) => {
        if (bulkAction === 'delete') {
          requests.push(adminProductsApi.delete(id));
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
      alert((apiError as Error).message || t('bulkActionError'));
    } finally {
      setProcessingBulk(false);
    }
  };

  const formatCurrency = (value?: string | number | null) => {
    const numeric = Number(value ?? 0);
    return `$${numeric.toFixed(2)}`;
  };

  const getStatusLabelKey = (product: AdminProductSummary) => {
    if (!product.isActive) {
      return 'statusLabelArchived';
    }
    if ((product.stockQuantity ?? 0) === 0) {
      return 'statusLabelOutOfStock';
    }
    return 'statusLabelActive';
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
          <p className="text-muted" data-i18n="productsSubtitle">
            Manage product catalog, status, inventory, and pricing
          </p>
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
            data-i18n-placeholder="searchProducts"
            data-i18n-aria-label="searchProducts"
            aria-label="Search products"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            data-field="searchQuery"
          />
          <button type="submit" className="btn btn--outline btn--xs" data-i18n="search">
            Search
          </button>
        </form>
        <select
          value={categoryFilter}
          onChange={(event) => handleCategoryFilterChange(event.target.value)}
          aria-label="Filter by category"
          data-field="categoryFilter"
        >
          <option value="" data-i18n="allCategories">
            All Categories
          </option>
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
            <option key={option.value} value={option.value} data-i18n={option.labelKey}>
              {t(option.labelKey) || option.fallback}
            </option>
          ))}
        </select>
        <div className="bulk-actions">
          <span>
            <span data-i18n="selectedLabel">{t('selectedLabel')}</span>:&nbsp;<strong>{selectedIds.size}</strong>
          </span>
          <select
            value={bulkAction}
            onChange={(event) => setBulkAction(event.target.value)}
            disabled={selectedIds.size === 0 || processingBulk}
          >
            <option value="" data-i18n="bulkActionPlaceholder">
              Bulk action…
            </option>
            <option value="activate" data-i18n="bulkActivate">
              Activate
            </option>
            <option value="deactivate" data-i18n="bulkDeactivate">
              Disable
            </option>
            <option value="delete" data-i18n="bulkDelete">
              Delete
            </option>
          </select>
          <button
            type="button"
            className="btn btn--outline btn--xs"
            onClick={handleBulkAction}
            disabled={!bulkAction || selectedIds.size === 0 || processingBulk}
            data-i18n="bulkApply"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="admin-table-wrapper" data-api="/api/admin/products" data-method="GET">
        {isLoading ? (
          <div className="admin-table-placeholder" data-i18n="loadingProducts">
            Loading products…
          </div>
        ) : error ? (
          <div className="admin-table-placeholder error" data-i18n="failedProducts">
            Failed to load products.
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="admin-table-placeholder" data-i18n="emptyProducts">
            No products match current filters.
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Select all products"
                    data-i18n-aria-label="selectAllProducts"
                    checked={allSelected}
                    onChange={(event) => handleToggleAll(event.target.checked)}
                  />
                </th>
                <th data-i18n="productColumn">Product</th>
                <th data-i18n="skuColumn">SKU</th>
                <th data-i18n="categoryColumn">Category</th>
                <th data-i18n="priceColumn">Price</th>
                <th data-i18n="inventoryColumn">Inventory</th>
                <th data-i18n="statusColumn">Status</th>
                <th data-i18n="updatedColumn">Updated</th>
                <th data-i18n="actionsColumn">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className="clickable-row"
                  onClick={() => router.push(`/admin/products/${product.id}`)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
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
                        ) : product.images?.[0]?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.images[0].url} alt={product.images[0].alt || ''} />
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
                  <td data-field="category">
                    {product.category?.name || <span data-i18n="categoryUnassigned">Unassigned</span>}
                  </td>
                  <td data-field="price">{formatCurrency(product.salePrice ?? product.basePrice)}</td>
                  <td data-field="inventory">{product.stockQuantity ?? 0}</td>
                  <td>
                    {(() => {
                      const statusKey = getStatusLabelKey(product);
                      return (
                        <span className={statusClass(product)} data-field="status" data-i18n={statusKey}>
                          {t(statusKey)}
                        </span>
                      );
                    })()}
                  </td>
                  <td data-field="updatedAt">
                    {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : '—'}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn--outline btn--xs"
                        onClick={() => handleStatusChange(product)}
                        data-i18n={product.isActive ? 'deactivateProduct' : 'activateProduct'}
                        title={product.isActive ? t('deactivateProduct') : t('activateProduct')}
                      >
                        {product.isActive ? t('deactivateProduct') : t('activateProduct')}
                      </button>
                      <div className="actions-dropdown">
                        <button type="button" className="actions-dropdown-btn" aria-haspopup="menu" aria-expanded="false">
                          ⋯
                        </button>
                        <div className="actions-dropdown-menu" role="menu">
                          <Link href={`/admin/products/${product.id}`} role="menuitem" data-i18n="editProduct">
                            {t('editProduct')}
                          </Link>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => handleDelete(product)}
                            className="text-danger"
                            data-i18n="deleteProduct"
                          >
                            {t('deleteProduct') || 'Delete'}
                          </button>
                        </div>
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
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => canPrev && goToPage(remoteFilters.page - 1)}
            data-i18n="paginationPrevious"
          >
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
          <button
            type="button"
            disabled={!canNext}
            onClick={() => canNext && goToPage(remoteFilters.page + 1)}
            data-i18n="paginationNext"
          >
            Next
          </button>
        </div>
      )}
      <style jsx global>{`
        .clickable-row {
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        .clickable-row:hover {
          background-color: #f8fafc !important;
        }
      `}</style>
    </div>
  );
}
