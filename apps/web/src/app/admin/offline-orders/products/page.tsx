/**
 * Simple Offline Order Products Management Page
 * 简化的产品管理页面
 */
'use client';

// 2026-03-06 09:55:00: 增加分类/供应商绑定与筛选
// 2026-03-11 07:45:30: 调整分页始终可见 + 新增产品后回到第一页，确保最新产品排在最前

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  authApi,
  simpleOfflineOrderProductApi,
  SimpleOfflineOrderProduct,
  adminCategoriesApi,
  AdminCategorySummary,
  suppliersApi,
  Supplier,
} from '@/lib/api';
import useSWR from 'swr';
import DeleteConfirmationModal from '@/components/ui/DeleteConfirmationModal';

export default function SimpleOfflineOrderProductsPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null);

  const [newProductName, setNewProductName] = useState('');
  const [newProductImageUrl, setNewProductImageUrl] = useState('');
  const [newProductIsCustomerOwned, setNewProductIsCustomerOwned] = useState(false);
  const [newProductUnitCost, setNewProductUnitCost] = useState<string>('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductStockQuantity, setNewProductStockQuantity] = useState<string>('');
  const [newProductCategoryId, setNewProductCategoryId] = useState<string>('');
  const [newProductSupplierId, setNewProductSupplierId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SimpleOfflineOrderProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDeleteId, setProductToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [categoryFilterId, setCategoryFilterId] = useState<string>('');
  const [categoryFilterL1Id, setCategoryFilterL1Id] = useState<string>('');
  const [newProductCategoryL1Id, setNewProductCategoryL1Id] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<{ id?: string; name: string; slug: string; parentId?: string }>({
    id: undefined,
    name: '',
    slug: '',
    parentId: undefined,
  });
  const [expandedCatIds, setExpandedCatIds] = useState<string[]>([]);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({
    name: '',
    apiUrl: '',
    apiKey: '',
    apiSecret: '',
    isActive: true,
    syncInterval: 3600,
  });

  // 认证检查
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const me = await authApi.me();
        const role = me?.role ? String(me.role).toUpperCase() : '';
        if (!['SALES_MANAGER', 'ADMIN'].includes(role)) {
          router.replace('/offline-orders/sales/login');
          return;
        }
        setCurrentUser(me);
      } catch {
        router.replace('/offline-orders/sales/login');
      } finally {
        setAuthChecking(false);
      }
    };
    checkAuth();
  }, [router]);

  // 获取产品列表
  const {
    data: productsData,
    error: productsError,
    mutate: mutateProducts,
  } = useSWR(
    'simple-offline-order-products-admin',
    () => simpleOfflineOrderProductApi.listAll(),
    {
      revalidateOnFocus: true,
    }
  );

  const products: SimpleOfflineOrderProduct[] = productsData?.data || [];

  const { data: categoriesData, mutate: mutateCategories } = useSWR(
    'admin-categories-for-offline-products',
    () => adminCategoriesApi.list({ status: 'active', limit: 200, page: 1 }),
  );
  const categories: AdminCategorySummary[] = categoriesData?.data || [];

  const { data: suppliersData, mutate: mutateSuppliers } = useSWR('admin-suppliers-for-offline-products', () =>
    suppliersApi.list(),
  );
  const suppliers: Supplier[] = suppliersData?.suppliers || [];

  const filteredProducts = useMemo(() => {
    let result = products;
    if (categoryFilterL1Id && !categoryFilterId) {
      const l2Ids = categories.filter((c) => c.parent?.id === categoryFilterL1Id || c.id === categoryFilterL1Id).map((c) => c.id);
      result = result.filter((p) => p.categoryId && l2Ids.includes(p.categoryId));
    } else if (categoryFilterId) {
      result = result.filter((p) => p.categoryId === categoryFilterId);
    }
    
    // Sort by newest first (assuming higher id or creation date)
    result = [...result].sort((a, b) => {
      // If we have createdAt, use it, otherwise fall back to id string comparison (which might loosely correlate to time for cuid/uuid v7)
      if ((a as any).createdAt && (b as any).createdAt) {
          return new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime();
      }
      return b.id.localeCompare(a.id);
    });

    return result;
  }, [products, categoryFilterL1Id, categoryFilterId, categories]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilterL1Id, categoryFilterId]);

  // 添加产品
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      setError('产品名称不能为空');
      return;
    }

    if (!newProductCategoryId) {
      setError('请选择产品分类');
      return;
    }

    const unitCost = newProductUnitCost ? Number.parseFloat(newProductUnitCost) : undefined;
    const stockQuantity = newProductStockQuantity ? Number.parseInt(newProductStockQuantity, 10) : undefined;

    setIsSubmitting(true);
    setError(null);

    try {
      await simpleOfflineOrderProductApi.create({
        name: newProductName.trim(),
        imageUrl: newProductImageUrl.trim() || undefined,
        isCustomerOwned: newProductIsCustomerOwned,
        unitCost,
        categoryId: newProductCategoryId,
        supplierId: newProductSupplierId || undefined,
        sku: newProductSku.trim() || undefined,
        stockQuantity,
      });

      setNewProductName('');
      setNewProductImageUrl('');
      setNewProductIsCustomerOwned(false);
      setNewProductUnitCost('');
      setNewProductSku('');
      setNewProductStockQuantity('');
      setNewProductCategoryL1Id('');
      setNewProductCategoryId('');
      setNewProductSupplierId('');
      mutateProducts();
      setCurrentPage(1);
    } catch (err: any) {
      setError(err.message || '添加产品失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除产品
  const handleDeleteProduct = (id: string) => {
    setProductToDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDeleteId) return;
    setIsDeleting(true);
    try {
      await simpleOfflineOrderProductApi.delete(productToDeleteId);
      setIsDeleteModalOpen(false);
      setProductToDeleteId(null);
      mutateProducts();
    } catch (err: any) {
      setError(err.message || '删除产品失败');
    } finally {
      setIsDeleting(false);
    }
  };

  // 切换产品状态
  const handleToggleActive = async (product: SimpleOfflineOrderProduct) => {
    try {
      await simpleOfflineOrderProductApi.update(product.id, {
        isActive: !product.isActive,
      });
      mutateProducts();
    } catch (err: any) {
      setError(err.message || '更新产品状态失败');
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">检查权限中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">线下订单产品管理</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* 添加产品表单 — 3 行 + 按钮单独一行 */}
          <form onSubmit={handleAddProduct} className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">添加新产品</h2>
            <div className="space-y-6">
              {/* ── 第 1 行：产品名称、图片URL、成本 + 分类、供应商 ── */}
              <div className="space-y-4 pb-6 border-b border-gray-200">
                {/* 上半：名称、图片URL、成本 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      产品名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="例如：T恤、卫衣"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      产品图片 URL（可选）
                    </label>
                    <input
                      type="url"
                      value={newProductImageUrl}
                      onChange={(e) => setNewProductImageUrl(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">成本单价（CAD）</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newProductUnitCost}
                      onChange={(e) => setNewProductUnitCost(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="5.50"
                    />
                  </div>
                </div>
                {/* 下半：分类(+管理)、供应商(+管理) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      分类 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={newProductCategoryL1Id}
                        onChange={(e) => {
                          setNewProductCategoryL1Id(e.target.value);
                          setNewProductCategoryId('');
                        }}
                        className="min-w-0 flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">请选择 L1 分类</option>
                        {categories
                          .filter((c) => c.isActive && !c.parent)
                          .map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                      </select>
                      <select
                        value={newProductCategoryId}
                        onChange={(e) => setNewProductCategoryId(e.target.value)}
                        disabled={!newProductCategoryL1Id}
                        className="min-w-0 flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">请选择 L2 分类</option>
                        {categories
                          .filter((c) => c.isActive && c.parent?.id === newProductCategoryL1Id)
                          .map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryForm({ id: undefined, name: '', slug: '' });
                          setIsCategoryModalOpen(true);
                        }}
                        className="px-3 py-2 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 whitespace-nowrap"
                      >
                        管理分类
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">供应商（可选）</label>
                    <div className="flex gap-2">
                      <select
                        value={newProductSupplierId}
                        onChange={(e) => setNewProductSupplierId(e.target.value)}
                        className="min-w-0 flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">不指定</option>
                        {suppliers
                          .filter((s) => s.isActive)
                          .map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setSupplierForm({
                            name: '',
                            apiUrl: '',
                            apiKey: '',
                            apiSecret: '',
                            isActive: true,
                            syncInterval: 3600,
                          });
                          setIsSupplierModalOpen(true);
                        }}
                        className="px-3 py-2 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 whitespace-nowrap"
                      >
                        管理供应商
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 第 2 行：SKU、初始库存、客户自带服装 ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU（可选）</label>
                  <input
                    type="text"
                    value={newProductSku}
                    onChange={(e) => setNewProductSku(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="唯一 SKU，用于同步主目录"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">初始库存（可选）</label>
                  <input
                    type="number"
                    min="0"
                    value={newProductStockQuantity}
                    onChange={(e) => setNewProductStockQuantity(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例如：100"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isCustomerOwned"
                      checked={newProductIsCustomerOwned}
                      onChange={(e) => setNewProductIsCustomerOwned(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isCustomerOwned" className="ml-2 text-sm text-gray-700">
                      客户自带服装
                    </label>
                  </div>
                </div>
              </div>

              {/* ── 第 3 行：添加产品按钮（单独占一行） ── */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isSubmitting ? '添加中...' : '添加产品'}
                </button>
              </div>
            </div>
          </form>

          {/* 产品列表 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">产品列表</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">按分类筛选：</span>
                <select
                  value={categoryFilterL1Id}
                  onChange={(e) => {
                    setCategoryFilterL1Id(e.target.value);
                    setCategoryFilterId('');
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全部 L1 分类</option>
                  {categories
                    .filter((c) => c.isActive && !c.parent)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
                <select
                  value={categoryFilterId}
                  onChange={(e) => {
                    setCategoryFilterId(e.target.value);
                    setCurrentPage(1);
                  }}
                  disabled={!categoryFilterL1Id}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全部 L2 分类</option>
                  {categories
                    .filter((c) => c.isActive && c.parent?.id === categoryFilterL1Id)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            {productsError ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                加载产品列表失败：{productsError.message}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-600 text-sm text-center">
                暂无产品，请添加第一个产品
              </div>
            ) : (
              <div className="space-y-2">
                {paginatedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {product.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{product.name}</span>
                          {product.isCustomerOwned ? (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">客户自带</span>
                          ) : (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">标准产品</span>
                          )}
                          {!product.isActive && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">已禁用</span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                          {product.categoryName && (
                            <span>
                              分类：
                              {(() => {
                                const cat = categories.find((c) => c.id === product.categoryId);
                                if (cat?.parent) {
                                  return `${cat.parent.name} / ${cat.name}`;
                                }
                                return product.categoryName;
                              })()}
                            </span>
                          )}
                          {product.supplierName && <span>供应商：{product.supplierName}</span>}
                          {product.sku && <span>SKU：{product.sku}</span>}
                          {typeof product.unitCost === 'number' && (
                            <span>成本：${product.unitCost.toFixed(2)}</span>
                          )}
                          {typeof product.stockQuantity === 'number' && <span>库存：{product.stockQuantity}</span>}
                        </div>
                        {product.imageUrl && (
                          <a
                            href={product.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            查看图片
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(product)}
                        className={`px-3 py-1 text-sm rounded ${product.isActive
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          } transition-colors`}
                      >
                        {product.isActive ? '启用' : '禁用'}
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination Controls */}
            {filteredProducts.length > 0 && (
              <div className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-lg">
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      第 <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> 到 <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> 条，共 <span className="font-medium">{filteredProducts.length}</span> 条
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* Page Numbers */}
                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const page = idx + 1;
                        // Show first, last, current, and +/- 1 from current
                        if (
                          page === 1 || 
                          page === totalPages || 
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              aria-current={currentPage === page ? 'page' : undefined}
                              className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                currentPage === page
                                  ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                  : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        } else if (
                          page === currentPage - 2 || 
                          page === currentPage + 2
                        ) {
                          return (
                            <span key={`ellipsis-${page}`} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DeleteConfirmationModal
            isOpen={isDeleteModalOpen}
            isDeleting={isDeleting}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={confirmDeleteProduct}
            title="删除产品"
            description="确定要删除这个产品吗？产品会被标记为禁用，在列表中隐藏。"
          />

          {/* 分类管理简易弹窗 */}
          {isCategoryModalOpen && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {categoryForm.id ? '编辑分类' : '新增分类'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                    <input
                      type="text"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">父级分类 (可选)</label>
                    <select
                      value={categoryForm.parentId || ''}
                      onChange={(e) => setCategoryForm((prev) => ({ ...prev, parentId: e.target.value || undefined }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">(无 - 作为 L1 分类)</option>
                      {categories
                        .filter((c) => c.isActive && !c.parent && c.id !== categoryForm.id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </div>
                  {/* 移除 Slug 输入，改为自动生成 */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(false)}
                      className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!categoryForm.name.trim()) {
                          setError('分类名称不能为空');
                          return;
                        }
                        try {
                          const autoSlug = categoryForm.slug?.trim() || `cat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
                          if (categoryForm.id) {
                            await adminCategoriesApi.update(categoryForm.id, {
                              name: categoryForm.name.trim(),
                              slug: autoSlug,
                              parentId: categoryForm.parentId || null,
                            });
                          } else {
                            await adminCategoriesApi.create({
                              name: categoryForm.name.trim(),
                              slug: autoSlug,
                              parentId: categoryForm.parentId || null,
                            });
                          }
                          await mutateCategories();
                          setIsCategoryModalOpen(false);
                          setCategoryForm({ id: undefined, name: '', slug: '', parentId: undefined });
                        } catch (err: any) {
                          alert(`保存分类失败: ${err.message}`);
                          setError(err.message || '保存分类失败');
                        }
                      }}
                      className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                      保存
                    </button>
                  </div>
                  <div className="mt-4 border-t pt-3">
                    <p className="text-xs text-gray-500 mb-2">当前有效分类（点击名称编辑，点击停用按钮进行软删除）：</p>
                    <div className="max-h-[50vh] min-h-[10rem] overflow-y-auto space-y-1 text-sm pr-2">
                      {categories
                        .filter((c) => c.isActive && !c.parent)
                        .map((category) => {
                          const isExpanded = expandedCatIds.includes(category.id);
                          const children = categories.filter((c) => c.isActive && c.parent?.id === category.id);
                          return (
                            <div key={category.id} className="mb-2 border rounded-md overflow-hidden">
                              <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
                                <div className="flex items-center gap-2 flex-1">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedCatIds((prev) =>
                                      isExpanded ? prev.filter((id) => id !== category.id) : [...prev, category.id]
                                    )}
                                    className="p-1 hover:bg-gray-200 rounded text-gray-500"
                                  >
                                    <svg
                                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCategoryForm({ id: category.id, name: category.name, slug: category.slug, parentId: undefined })}
                                    className="text-left font-medium text-gray-800 hover:underline flex-1"
                                  >
                                    {category.name} <span className="text-xs font-normal text-gray-500 ml-1">({children.length} 子分类)</span>
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await adminCategoriesApi.archive(category.id);
                                      await mutateCategories();
                                    } catch (err: any) {
                                      setError(err.message || '停用分类失败');
                                    }
                                  }}
                                  className="text-xs text-red-600 hover:text-red-800 px-2"
                                >
                                  停用
                                </button>
                              </div>
                              {isExpanded && (
                                <div className="p-2 space-y-1 bg-white">
                                  {children.length === 0 ? (
                                    <div className="text-xs text-gray-400 py-1 pl-8">无子分类</div>
                                  ) : (
                                    children.map((child) => (
                                      <div key={child.id} className="flex items-center justify-between pl-8 py-1 hover:bg-gray-50 rounded">
                                        <button
                                          type="button"
                                          onClick={() => setCategoryForm({ id: child.id, name: child.name, slug: child.slug, parentId: category.id })}
                                          className="text-left text-sm text-gray-700 hover:underline"
                                        >
                                          {child.name}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              await adminCategoriesApi.archive(child.id);
                                              await mutateCategories();
                                            } catch (err: any) {
                                              setError(err.message || '停用分类失败');
                                            }
                                          }}
                                          className="text-xs text-red-500 hover:text-red-700 pr-2"
                                        >
                                          停用
                                        </button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 供应商管理简易弹窗 */}
          {isSupplierModalOpen && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {supplierForm.id ? '编辑供应商' : '新增供应商'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                    <input
                      type="text"
                      value={supplierForm.name || ''}
                      onChange={(e) => setSupplierForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {/* API 字段对服装供应商来说无用，直接隐藏并清理表单界面 */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsSupplierModalOpen(false)}
                      className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!supplierForm.name?.trim()) {
                          setError('供应商名称不能为空');
                          return;
                        }
                        try {
                          if (supplierForm.id) {
                            await suppliersApi.update(supplierForm.id, supplierForm);
                          } else {
                            await suppliersApi.create(supplierForm);
                          }
                          await mutateSuppliers();
                          setIsSupplierModalOpen(false);
                          setSupplierForm({
                            name: '',
                            apiUrl: '',
                            apiKey: '',
                            apiSecret: '',
                            isActive: true,
                            syncInterval: 3600,
                          });
                        } catch (err: any) {
                          alert(`保存供应商失败: ${err.message}`);
                          setError(err.message || '保存供应商失败');
                        }
                      }}
                      className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                      保存
                    </button>
                  </div>
                  <div className="mt-4 border-t pt-3">
                    <p className="text-xs text-gray-500 mb-2">当前有效供应商（点击名称编辑，点击停用按钮进行软删除）：</p>
                    <div className="max-h-[50vh] min-h-[10rem] overflow-y-auto space-y-1 text-sm pr-2">
                      {suppliers
                        .filter((s) => s.isActive)
                        .map((supplier) => (
                          <div key={supplier.id} className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => {
                                setSupplierForm(supplier);
                              }}
                              className="text-left text-gray-800 hover:underline"
                            >
                              {supplier.name}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await suppliersApi.update(supplier.id, { isActive: false });
                                  await mutateSuppliers();
                                } catch (err: any) {
                                  setError(err.message || '停用供应商失败');
                                }
                              }}
                              className="text-xs text-red-600 hover:underline"
                            >
                              停用
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

