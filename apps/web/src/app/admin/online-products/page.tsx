'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import Image from 'next/image';
import { adminProductsApi, AdminProductSummary, adminCategoriesApi } from '@/lib/api';
import { useAdminI18n } from '@/contexts/adminI18nContext';

type StatusFilter = 'all' | 'active' | 'out_of_stock' | 'archived';

export default function AdminProductsPage() {
  const { t } = useAdminI18n();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilterL1, setCategoryFilterL1] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Debounce search
  const [searchDraft, setSearchDraft] = useState('');

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');

  // Delete modal
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading, error, mutate } = useSWR(
    [`admin-products`, page, limit, statusFilter, searchQuery, categoryFilter],
    () => adminProductsApi.list({
      page,
      limit,
      status: statusFilter === 'all' ? undefined : (statusFilter === 'active' ? 'active' : 'inactive'),
      search: searchQuery,
      categoryId: categoryFilter || undefined
    })
  );

  const { data: categoriesData } = useSWR('admin-categories', () =>
    adminCategoriesApi.list({ limit: 100 })
  );

  const handleSearch = () => {
    setSearchQuery(searchDraft);
    setPage(1);
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked && data?.data) {
      const allIds = data.data.map((p: AdminProductSummary) => p.id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return;

    if (bulkAction === 'delete') {
      if (!confirm(`Are you sure you want to delete ${selectedIds.size} products?`)) return;
    }

    try {
      setIsDeleting(true);
      const ids = Array.from(selectedIds);

      switch (bulkAction) {
        case 'activate':
          await adminProductsApi.bulkUpdateStatus(ids, 'active');
          break;
        case 'deactivate':
          await adminProductsApi.bulkUpdateStatus(ids, 'inactive');
          break;
        case 'delete':
          await adminProductsApi.bulkDelete(ids);
          break;
      }

      await mutate();
      setSelectedIds(new Set());
      setBulkAction('');
    } catch (err) {
      console.error('Bulk action failed', err);
      alert('Failed to perform bulk action');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      await adminProductsApi.delete(deleteId);
      setDeleteId(null);
      mutate();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (product: AdminProductSummary) => {
    try {
      await adminProductsApi.updateStatus(product.id, !product.isActive);
      mutate();
    } catch (err) {
      console.error('Status update failed', err);
    }
  };

  // Helper for status update call - existing API uses { isActive: boolean } in updateStatus?
  // I added updateStatus(id, status: string) to lib/api.ts for single update?
  // Checked lib/api.ts:
  // updateStatus: (id: string, isActive: boolean) => api(..., {body: {isActive}})  (Line 1649)
  // BUT I appended a duplicate updateStatus with (id: string, status: string) later but deleted it?
  // NO, I deleted the DUPLICATE block. So the ORIGINAL one takes (id, isActive).
  // I MUST USE (id, isActive).

  const allSelected = data?.data && data.data.length > 0 && selectedIds.size === data.data.length;

  const statusOptions: Array<{ value: StatusFilter; labelKey: string }> = [
    { value: 'all', labelKey: 'statusFilterAll' },
    { value: 'active', labelKey: 'statusFilterActive' },
    { value: 'out_of_stock', labelKey: 'statusFilterOutOfStock' },
    { value: 'archived', labelKey: 'statusFilterArchived' },
  ];

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1 data-i18n="products">{t('productsTitle')}</h1>
          <p className="text-muted" data-i18n="productsSubtitle">
            {t('productsSubtitle')}
          </p>
        </div>
        <Link href="/admin/online-products/new" className="btn btn--primary" data-i18n="newProduct">
          {t('newProduct')}
        </Link>
      </header>

      <div className="admin-filters">
        <div className="admin-filters-group">
          <div className="search-box">
            <input
              type="search"
              placeholder={t('searchProducts')}
              data-i18n-placeholder="searchProducts"
              aria-label={t('searchProducts')}
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button type="button" className="btn btn--outline btn--xs" onClick={handleSearch} data-i18n="search">
              {t('search')}
            </button>
          </div>

          <select
            value={categoryFilterL1}
            onChange={(e) => {
              setCategoryFilterL1(e.target.value);
              setCategoryFilter('');
            }}
            className="filter-select"
          >
            <option value="">L1</option>
            {categoriesData?.data?.filter((c: any) => !c.parent).map((cat: any) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            disabled={!categoryFilterL1}
            className="filter-select"
          >
            <option value="" data-i18n="allCategories">
              {t('allCategories')} L2
            </option>
            {categoriesData?.data?.filter((c: any) => c.parent?.id === categoryFilterL1).map((cat: any) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="filter-select"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value} data-i18n={option.labelKey}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-filters-group">
          <span className="text-sm text-muted">
            <span data-i18n="selectedLabel">{t('selectedLabel')}</span>:&nbsp;<strong>{selectedIds.size}</strong>
          </span>
          <select
            value={bulkAction}
            onChange={(event) => setBulkAction(event.target.value)}
            disabled={selectedIds.size === 0 || isDeleting}
            className="filter-select"
          >
            <option value="" data-i18n="bulkActionPlaceholder">
              {t('bulkActionPlaceholder')}
            </option>
            <option value="activate" data-i18n="bulkActivate">
              {t('bulkActivate')}
            </option>
            <option value="deactivate" data-i18n="bulkDeactivate">
              {t('bulkDeactivate')}
            </option>
            <option value="delete" data-i18n="bulkDelete">
              {t('bulkDelete')}
            </option>
          </select>
          <button
            type="button"
            className="btn btn--outline btn--xs"
            onClick={handleBulkAction}
            disabled={!bulkAction || selectedIds.size === 0 || isDeleting}
            data-i18n="bulkApply"
          >
            {isDeleting ? t('saving') : t('bulkApply')}
          </button>
        </div>
      </div>

      {isLoading && <div className="admin-table-placeholder" data-i18n="loadingProducts">{t('loadingProducts')}</div>}
      {error && <div className="admin-table-placeholder error" data-i18n="failedProducts">{t('failedProducts')}</div>}

      {!isLoading && !error && data?.data?.length === 0 && (
        <div className="admin-table-placeholder" data-i18n="emptyProducts">
          {t('emptyProducts')}
        </div>
      )}

      {!isLoading && !error && data?.data && data.data.length > 0 && (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-12">
                  <input
                    type="checkbox"
                    aria-label={t('selectAll')}
                    checked={allSelected}
                    onChange={(event) => handleToggleAll(event.target.checked)}
                  />
                </th>
                <th data-i18n="productColumn">{t('productColumn')}</th>
                <th data-i18n="skuColumn">{t('skuColumn')}</th>
                <th data-i18n="categoryColumn">{t('categoryColumn')}</th>
                <th data-i18n="priceColumn">{t('priceColumn')}</th>
                <th data-i18n="inventoryColumn">{t('inventoryColumn')}</th>
                <th data-i18n="statusColumn">{t('statusColumn')}</th>
                <th data-i18n="updatedColumn">{t('updatedColumn')}</th>
                <th className="text-right" data-i18n="actionsColumn">{t('actionsColumn')}</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((product: AdminProductSummary) => (
                <tr key={product.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${product.name}`}
                      checked={selectedIds.has(product.id)}
                      onChange={() => handleToggleSelect(product.id)}
                    />
                  </td>
                  <td>
                    <div className="product-cell">
                      <div className="product-image">
                        {product.images?.[0] ? (
                          <Image
                            src={product.images[0].url || product.images[0] as unknown as string}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
                            No Item
                          </div>
                        )}
                      </div>
                      <div className="product-info">
                        <Link href={`/admin/online-products/${product.id}`} className="font-medium hover:underline">
                          {product.name}
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-sm">{product.sku || '-'}</td>
                  <td>
                    {product.category ? (
                      (() => {
                        const cat = categoriesData?.data?.find((c: any) => c.id === product.category?.id);
                        if (cat?.parent) {
                          return `${cat.parent.name} / ${cat.name}`;
                        }
                        return product.category.name;
                      })()
                    ) : <span data-i18n="categoryUnassigned">{t('categoryUnassigned')}</span>}
                  </td>
                  <td>${product.basePrice.toFixed(2)}</td>
                  <td>
                    <span className="badge badge--success">{product.stockQuantity}</span>
                  </td>
                  <td>
                    <span className={`badge ${product.isActive ? 'badge--success' : 'badge--warning'}`}>
                      {product.isActive ? t('statusFilterActive') : t('statusFilterArchived')}
                    </span>
                  </td>
                  <td className="text-sm text-muted">
                    {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn btn--outline btn--xs"
                        onClick={() => adminProductsApi.updateStatus(product.id, !product.isActive)}
                        data-i18n={product.isActive ? 'deactivateProduct' : 'activateProduct'}
                        title={product.isActive ? t('deactivateProduct') : t('activateProduct')}
                      >
                        {product.isActive ? t('deactivateProduct') : t('activateProduct')}
                      </button>
                      <Link
                        href={`/admin/online-products/${product.id}`}
                        className="btn btn--outline btn--xs"
                        data-i18n="editProduct"
                      >
                        {t('editProduct')}
                      </Link>
                      <button
                        type="button"
                        className="btn btn--outline btn--xs btn--danger"
                        onClick={() => setDeleteId(product.id)}
                        data-i18n="deleteProduct"
                        title={t('deleteProduct')}
                      >
                        {t('deleteProduct')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="admin-pagination">
            <button
              className="btn btn--outline"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              data-i18n="previousPage"
            >
              {t('previousPage')}
            </button>
            <span>
              Page {page} of {Math.ceil((data.pagination?.total || 0) / limit)}
            </span>
            <button
              className="btn btn--outline"
              disabled={page >= Math.ceil((data.pagination?.total || 0) / limit)}
              onClick={() => setPage(p => p + 1)}
              data-i18n="nextPage"
            >
              {t('nextPage')}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 data-i18n="deleteProductTitle">{t('deleteProductTitle')}</h3>
            <p data-i18n="deleteProductConfirm">{t('deleteProductConfirm')}</p>
            <div className="modal-actions">
              <button
                className="btn btn--outline"
                onClick={() => setDeleteId(null)}
                disabled={isDeleting}
                data-i18n="cancel"
              >
                {t('cancel')}
              </button>
              <button
                className="btn btn--danger"
                onClick={handleDelete}
                disabled={isDeleting}
                data-i18n="delete"
              >
                {isDeleting ? t('saving') : t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
