/**
 * Simple Offline Order Products Management Page
* 简化的产品管理页面
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, simpleOfflineOrderProductApi, SimpleOfflineOrderProduct } from '@/lib/api';
import useSWR from 'swr';

export default function SimpleOfflineOrderProductsPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null);

  const [newProductName, setNewProductName] = useState('');
  const [newProductImageUrl, setNewProductImageUrl] = useState('');
  const [newProductIsCustomerOwned, setNewProductIsCustomerOwned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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
  const { data: productsData, error: productsError, mutate: mutateProducts } = useSWR(
    'simple-offline-order-products-admin',
    () => simpleOfflineOrderProductApi.listAll(),
    {
      revalidateOnFocus: true,
    }
  );

  const products: SimpleOfflineOrderProduct[] = productsData?.data || [];

  // 添加产品
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      setError('产品名称不能为空');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await simpleOfflineOrderProductApi.create({
        name: newProductName.trim(),
        imageUrl: newProductImageUrl.trim() || undefined,
        isCustomerOwned: newProductIsCustomerOwned,
      });

      setNewProductName('');
      setNewProductImageUrl('');
      setNewProductIsCustomerOwned(false);
      mutateProducts();
    } catch (err: any) {
      setError(err.message || '添加产品失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除产品
  const handleDeleteProduct = async (id: string) => {
    // Confirm dialog removed per user request
    // if (!confirm('确定要删除这个产品吗？')) {
    //   return;
    // }

    try {
      await simpleOfflineOrderProductApi.delete(id);
      mutateProducts();
    } catch (err: any) {
      setError(err.message || '删除产品失败');
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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">产品管理</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* 添加产品表单 */}
          <form onSubmit={handleAddProduct} className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">添加新产品</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  产品名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：T恤、卫衣、帽子等"
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
                  placeholder="https://example.com/image.jpg"
                />
              </div>
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
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? '添加中...' : '添加产品'}
              </button>
            </div>
          </form>

          {/* 产品列表 */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">产品列表</h2>
            {productsError ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                加载产品列表失败：{productsError.message}
              </div>
            ) : products.length === 0 ? (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-600 text-sm text-center">
                暂无产品，请添加第一个产品
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {product.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{product.name}</span>
                          {product.isCustomerOwned && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              客户自带
                            </span>
                          )}
                          {!product.isActive && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              已禁用
                            </span>
                          )}
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
          </div>
        </div>
      </div>
    </div>
  );
}

