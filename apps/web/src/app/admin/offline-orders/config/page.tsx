/**
 * Offline Orders Configuration Page
 * [2025-12-07 05:00:00] 线下订单配置管理页面（产品、颜色、尺码费用、可用性等）
 * [2025-12-07 05:50:00] 在当前页面直接实现配置功能
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, api } from '@/lib/api';
import Link from 'next/link';
import useSWR from 'swr';

interface Color {
  id: string;
  name: string;
  hexCode: string | null;
}

interface SizeFee {
  id: string;
  size: string;
  additionalFee: number;
}

const ALLOWED_SIZES = ['2XL', '3XL', '4XL', '5XL'];

export default function OfflineOrdersConfigPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'colors' | 'sizeFees' | 'products'>('colors');
  
  // 产品管理
  const [products, setProducts] = useState<Array<{ id: string; name: string; imageUrl: string | null; isCustomerOwned: boolean }>>([]);
  const [newProductName, setNewProductName] = useState('');
  const [newProductImageUrl, setNewProductImageUrl] = useState('');
  const [newProductIsCustomerOwned, setNewProductIsCustomerOwned] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [editProductImageUrl, setEditProductImageUrl] = useState('');
  const [editProductIsCustomerOwned, setEditProductIsCustomerOwned] = useState(false);
  
  // 颜色管理
  const [colors, setColors] = useState<Color[]>([]);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('');
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [editColorName, setEditColorName] = useState('');
  const [editColorHex, setEditColorHex] = useState('');

  // 尺码费用
  const [sizeFees, setSizeFees] = useState<SizeFee[]>([]);
  const [editingSizeFeeId, setEditingSizeFeeId] = useState<string | null>(null);
  const [editSizeFee, setEditSizeFee] = useState('');

  const { data: colorsData, mutate: mutateColors } = useSWR(
    activeTab === 'colors' ? '/api/proxy/admin/offline-order-colors' : null,
    async (url) => {
      console.log('[Config Page] 🔵 Fetching colors from:', url);
      console.log('[Config Page] 🔵 Cookies:', document.cookie);
      
      try {
        const response = await fetch(url, { 
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log('[Config Page] 🔵 Response status:', response.status);
        console.log('[Config Page] 🔵 Response headers:', {
          'content-type': response.headers.get('content-type'),
          'set-cookie': response.headers.get('set-cookie'),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Config Page] ❌ Fetch failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          });
          throw new Error(`Failed to fetch colors: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[Config Page] ✅ Colors fetched successfully:', data);
        return data;
      } catch (error: any) {
        console.error('[Config Page] ❌ Fetch error:', error);
        throw error;
      }
    }
  );

  const { data: sizeFeesData, mutate: mutateSizeFees } = useSWR(
    activeTab === 'sizeFees' ? '/api/proxy/admin/offline-order-size-fees' : null,
    async (url) => {
      console.log('[Config Page] 🔵 Fetching size fees from:', url);
      const response = await fetch(url, { credentials: 'include' });
      console.log('[Config Page] 🔵 Size fees response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Config Page] ❌ Size fees fetch failed:', {
          status: response.status,
          error: errorText,
        });
        throw new Error(`Failed to fetch size fees: ${response.status}`);
      }
      return response.json();
    }
  );

  const { data: productsData, mutate: mutateProducts } = useSWR(
    activeTab === 'products' ? '/api/proxy/admin/offline-order-products' : null,
    async (url) => {
      console.log('[Config Page] 🔵 Fetching products from:', url);
      const response = await fetch(url, { credentials: 'include' });
      console.log('[Config Page] 🔵 Products response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Config Page] ❌ Products fetch failed:', {
          status: response.status,
          error: errorText,
        });
        throw new Error(`Failed to fetch products: ${response.status}`);
      }
      return response.json();
    }
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const me = await authApi.me().catch(() => null);
        const role = me?.role ? String(me.role).toUpperCase() : '';
        const isAuthorized = ['SALES_MANAGER', 'ADMIN'].includes(role);

        if (!me || !isAuthorized) {
          router.replace('/offline-orders/sales/login');
          return;
        }

        if (!cancelled) {
          setCurrentUser(me);
        }
      } catch (e) {
        router.replace('/offline-orders/sales/login');
        return;
      } finally {
        if (!cancelled) {
          setAuthChecking(false);
        }
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (colorsData?.data) {
      setColors(colorsData.data);
    }
  }, [colorsData]);

  useEffect(() => {
    if (sizeFeesData?.data) {
      setSizeFees(sizeFeesData.data);
    }
  }, [sizeFeesData]);

  useEffect(() => {
    if (productsData?.data) {
      setProducts(productsData.data);
    }
  }, [productsData]);

  // 颜色管理函数
  const handleCreateColor = async () => {
    if (!newColorName.trim()) return;
    try {
      await api('/api/proxy/admin/offline-order-colors', {
        method: 'POST',
        body: { name: newColorName.trim(), hexCode: newColorHex.trim() || null },
      });
      setNewColorName('');
      setNewColorHex('');
      mutateColors();
    } catch (err: any) {
      alert(err.message || '创建失败');
    }
  };

  const handleUpdateColor = async (id: string) => {
    if (!editColorName.trim()) return;
    try {
      await api(`/api/proxy/admin/offline-order-colors/${id}`, {
        method: 'PATCH',
        body: { name: editColorName.trim(), hexCode: editColorHex.trim() || null },
      });
      setEditingColorId(null);
      mutateColors();
    } catch (err: any) {
      alert(err.message || '更新失败');
    }
  };

  const handleDeleteColor = async (id: string) => {
    if (!confirm('确定要删除这个颜色吗？')) return;
    try {
      await api(`/api/proxy/admin/offline-order-colors/${id}`, { method: 'DELETE' });
      mutateColors();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  // 尺码费用管理函数
  const handleUpdateSizeFee = async (id: string, size: string, fee: number) => {
    try {
      await api(`/api/proxy/admin/offline-order-size-fees/${id}`, {
        method: 'PATCH',
        body: { size, additionalFee: fee },
      });
      setEditingSizeFeeId(null);
      mutateSizeFees();
    } catch (err: any) {
      alert(err.message || '更新失败');
    }
  };

  // 产品管理函数
  const handleCreateProduct = async () => {
    if (!newProductName.trim()) return;
    try {
      await api('/api/proxy/admin/offline-order-products', {
        method: 'POST',
        body: {
          name: newProductName.trim(),
          imageUrl: newProductImageUrl.trim() || null,
          isCustomerOwned: newProductIsCustomerOwned,
        },
      });
      setNewProductName('');
      setNewProductImageUrl('');
      setNewProductIsCustomerOwned(false);
      mutateProducts();
    } catch (err: any) {
      alert(err.message || '创建失败');
    }
  };

  const handleUpdateProduct = async (id: string) => {
    if (!editProductName.trim()) return;
    try {
      await api(`/api/proxy/admin/offline-order-products/${id}`, {
        method: 'PATCH',
        body: {
          name: editProductName.trim(),
          imageUrl: editProductImageUrl.trim() || null,
          isCustomerOwned: editProductIsCustomerOwned,
        },
      });
      setEditingProductId(null);
      mutateProducts();
    } catch (err: any) {
      alert(err.message || '更新失败');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('确定要删除这个产品吗？')) return;
    try {
      await api(`/api/proxy/admin/offline-order-products/${id}`, { method: 'DELETE' });
      mutateProducts();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  if (authChecking) {
    return (
      <div className="config-page-shell">
        <div className="config-page-card">
          <p>正在检查权限...</p>
        </div>
      </div>
    );
  }

  // 确保所有尺码都有配置
  const allSizeFees = ALLOWED_SIZES.map((size) => {
    const existing = sizeFees.find((sf) => sf.size === size);
    return existing || { id: '', size, additionalFee: 0 };
  });

  return (
    <div className="config-page-shell">
      <div className="config-page-card">
        <header className="config-page-header">
          <div>
            <h1>线下订单配置管理</h1>
            <p>配置产品、颜色、尺码费用和可用性等设置</p>
          </div>
          <Link href="/offline-orders/sales/orders" className="config-page-back-btn">
            返回订单列表
          </Link>
        </header>

        <div className="config-tabs">
          <button
            type="button"
            className={`config-tab ${activeTab === 'colors' ? 'active' : ''}`}
            onClick={() => setActiveTab('colors')}
          >
            颜色管理
          </button>
          <button
            type="button"
            className={`config-tab ${activeTab === 'sizeFees' ? 'active' : ''}`}
            onClick={() => setActiveTab('sizeFees')}
          >
            尺码费用
          </button>
          <button
            type="button"
            className={`config-tab ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            产品管理
          </button>
        </div>

        <div className="config-content">
          {activeTab === 'colors' && (
            <div className="config-tab-content">
              <h2>颜色管理</h2>
              <p className="config-desc">管理产品可选的颜色列表</p>
              
              <div className="config-form">
                <h3>添加新颜色</h3>
                <div className="config-form-row">
                  <input
                    type="text"
                    placeholder="颜色名称"
                    value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    className="config-input"
                  />
                  <input
                    type="text"
                    placeholder="十六进制颜色码（可选）"
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    className="config-input"
                    style={{ width: '200px' }}
                  />
                  <button onClick={handleCreateColor} className="config-btn config-btn-primary">
                    添加
                  </button>
                </div>
              </div>

              <div className="config-table-wrapper">
                <table className="config-table">
                  <thead>
                    <tr>
                      <th>颜色名称</th>
                      <th>颜色码</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colors.map((color) => (
                      <tr key={color.id}>
                        <td>
                          {editingColorId === color.id ? (
                            <input
                              type="text"
                              value={editColorName}
                              onChange={(e) => setEditColorName(e.target.value)}
                              className="config-input-inline"
                            />
                          ) : (
                            color.name
                          )}
                        </td>
                        <td>
                          {editingColorId === color.id ? (
                            <input
                              type="text"
                              value={editColorHex}
                              onChange={(e) => setEditColorHex(e.target.value)}
                              className="config-input-inline"
                            />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {color.hexCode && (
                                <div
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '4px',
                                    background: color.hexCode,
                                    border: '1px solid #ddd',
                                  }}
                                />
                              )}
                              {color.hexCode || '—'}
                            </div>
                          )}
                        </td>
                        <td>
                          {editingColorId === color.id ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleUpdateColor(color.id)}
                                className="config-btn config-btn-success"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => setEditingColorId(null)}
                                className="config-btn config-btn-secondary"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => {
                                  setEditingColorId(color.id);
                                  setEditColorName(color.name);
                                  setEditColorHex(color.hexCode || '');
                                }}
                                className="config-btn config-btn-secondary"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleDeleteColor(color.id)}
                                className="config-btn config-btn-danger"
                              >
                                删除
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {colors.length === 0 && (
                  <p style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>暂无颜色配置</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'sizeFees' && (
            <div className="config-tab-content">
              <h2>尺码费用配置</h2>
              <p className="config-desc">配置大尺码（2XL-5XL）的额外费用</p>
              
              <div className="config-table-wrapper">
                <table className="config-table">
                  <thead>
                    <tr>
                      <th>尺码</th>
                      <th>额外费用 (CAD)</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSizeFees.map((sf) => (
                      <tr key={sf.size}>
                        <td style={{ fontWeight: '600' }}>{sf.size}</td>
                        <td>
                          {editingSizeFeeId === sf.id ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editSizeFee}
                              onChange={(e) => setEditSizeFee(e.target.value)}
                              className="config-input-inline"
                              style={{ width: '120px' }}
                            />
                          ) : (
                            `$${sf.additionalFee.toFixed(2)}`
                          )}
                        </td>
                        <td>
                          {editingSizeFeeId === sf.id ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleUpdateSizeFee(sf.id, sf.size, parseFloat(editSizeFee) || 0)}
                                className="config-btn config-btn-success"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => setEditingSizeFeeId(null)}
                                className="config-btn config-btn-secondary"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingSizeFeeId(sf.id);
                                setEditSizeFee(sf.additionalFee.toString());
                              }}
                              className="config-btn config-btn-secondary"
                            >
                              编辑
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="config-tab-content">
              <h2>产品管理</h2>
              <p className="config-desc">管理线下订单可用的产品列表（显示哪些产品可以定制）</p>
              
              <div className="config-form">
                <h3>添加新产品</h3>
                <div className="config-form-row">
                  <input
                    type="text"
                    placeholder="产品名称"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    className="config-input"
                  />
                  <input
                    type="text"
                    placeholder="图片 URL（可选）"
                    value={newProductImageUrl}
                    onChange={(e) => setNewProductImageUrl(e.target.value)}
                    className="config-input"
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={newProductIsCustomerOwned}
                      onChange={(e) => setNewProductIsCustomerOwned(e.target.checked)}
                    />
                    客户自有产品
                  </label>
                  <button onClick={handleCreateProduct} className="config-btn config-btn-primary">
                    添加
                  </button>
                </div>
              </div>

              <div className="config-table-wrapper">
                <table className="config-table">
                  <thead>
                    <tr>
                      <th>产品名称</th>
                      <th>图片</th>
                      <th>类型</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td>
                          {editingProductId === product.id ? (
                            <input
                              type="text"
                              value={editProductName}
                              onChange={(e) => setEditProductName(e.target.value)}
                              className="config-input-inline"
                            />
                          ) : (
                            product.name
                          )}
                        </td>
                        <td>
                          {editingProductId === product.id ? (
                            <input
                              type="text"
                              value={editProductImageUrl}
                              onChange={(e) => setEditProductImageUrl(e.target.value)}
                              className="config-input-inline"
                              placeholder="图片 URL"
                            />
                          ) : product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          {editingProductId === product.id ? (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <input
                                type="checkbox"
                                checked={editProductIsCustomerOwned}
                                onChange={(e) => setEditProductIsCustomerOwned(e.target.checked)}
                              />
                              客户自有
                            </label>
                          ) : (
                            <span className={`tag ${product.isCustomerOwned ? 'tag-rush' : 'tag-active'}`}>
                              {product.isCustomerOwned ? '客户自有' : '标准产品'}
                            </span>
                          )}
                        </td>
                        <td>
                          {editingProductId === product.id ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleUpdateProduct(product.id)}
                                className="config-btn config-btn-success"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => setEditingProductId(null)}
                                className="config-btn config-btn-secondary"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => {
                                  setEditingProductId(product.id);
                                  setEditProductName(product.name);
                                  setEditProductImageUrl(product.imageUrl || '');
                                  setEditProductIsCustomerOwned(product.isCustomerOwned);
                                }}
                                className="config-btn config-btn-secondary"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="config-btn config-btn-danger"
                              >
                                删除
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {products.length === 0 && (
                  <p style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>暂无产品配置</p>
                )}
              </div>
            </div>
          )}
        </div>

        <style jsx>{`
          .config-page-shell {
            min-height: 100vh;
            padding: 2rem 1rem;
            background: radial-gradient(circle at top, #e0f2fe, #f9fafb);
            display: flex;
            justify-content: center;
          }
          .config-page-card {
            width: 100%;
            max-width: 1200px;
            background: #ffffff;
            border-radius: 18px;
            padding: 2rem 2.5rem;
            box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);
          }
          .config-page-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            margin-bottom: 2rem;
            padding-bottom: 1.5rem;
            border-bottom: 2px solid #e5e7eb;
          }
          .config-page-header h1 {
            margin: 0 0 0.4rem;
            font-size: 1.6rem;
            font-weight: 700;
            color: #111827;
          }
          .config-page-header p {
            margin: 0;
            font-size: 0.95rem;
            color: #6b7280;
          }
          .config-page-back-btn {
            padding: 0.6rem 1.3rem;
            border-radius: 999px;
            font-size: 0.9rem;
            font-weight: 600;
            background: #f3f4f6;
            color: #374151;
            text-decoration: none;
            transition: background 0.2s ease;
          }
          .config-page-back-btn:hover {
            background: #e5e7eb;
          }
          .config-tabs {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 2rem;
            border-bottom: 2px solid #e5e7eb;
          }
          .config-tab {
            padding: 0.75rem 1.5rem;
            border: none;
            background: transparent;
            color: #6b7280;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            margin-bottom: -2px;
            transition: all 0.2s ease;
          }
          .config-tab:hover {
            color: #2563eb;
          }
          .config-tab.active {
            color: #2563eb;
            border-bottom-color: #2563eb;
          }
          .config-content {
            min-height: 400px;
          }
          .config-tab-content h2 {
            margin: 0 0 0.5rem;
            font-size: 1.5rem;
            font-weight: 700;
            color: #111827;
          }
          .config-desc {
            margin: 0 0 2rem;
            font-size: 0.95rem;
            color: #6b7280;
          }
          .config-form {
            background: #f9fafb;
            padding: 1.5rem;
            border-radius: 12px;
            margin-bottom: 2rem;
          }
          .config-form h3 {
            margin: 0 0 1rem;
            font-size: 1.1rem;
            font-weight: 600;
            color: #111827;
          }
          .config-form-row {
            display: flex;
            gap: 0.5rem;
            align-items: flex-end;
          }
          .config-input {
            padding: 0.5rem;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 0.95rem;
            flex: 1;
          }
          .config-input:focus {
            outline: none;
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          }
          .config-input-inline {
            padding: 0.25rem 0.5rem;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 0.875rem;
            width: 100%;
          }
          .config-input-inline:focus {
            outline: none;
            border-color: #2563eb;
          }
          .config-btn {
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 600;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .config-btn-primary {
            background: #2563eb;
            color: #ffffff;
          }
          .config-btn-primary:hover {
            background: #1d4ed8;
          }
          .config-btn-success {
            background: #10b981;
            color: #ffffff;
          }
          .config-btn-success:hover {
            background: #059669;
          }
          .config-btn-danger {
            background: #ef4444;
            color: #ffffff;
          }
          .config-btn-danger:hover {
            background: #dc2626;
          }
          .config-btn-secondary {
            background: #ffffff;
            color: #374151;
            border: 1px solid #d1d5db;
          }
          .config-btn-secondary:hover {
            background: #f9fafb;
          }
          .config-table-wrapper {
            overflow-x: auto;
          }
          .config-table {
            width: 100%;
            border-collapse: collapse;
          }
          .config-table thead {
            background: #f9fafb;
          }
          .config-table th {
            padding: 0.75rem;
            text-align: left;
            font-weight: 600;
            color: #111827;
            border-bottom: 2px solid #e5e7eb;
          }
          .config-table td {
            padding: 0.75rem;
            border-bottom: 1px solid #e5e7eb;
          }
          .config-table tbody tr:hover {
            background: #f9fafb;
          }
          .config-link-btn {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-size: 0.95rem;
            font-weight: 600;
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: #ffffff;
            text-decoration: none;
            transition: transform 0.1s ease, box-shadow 0.1s ease;
          }
          .config-link-btn:hover {
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
            transform: translateY(-1px);
          }
          @media (max-width: 768px) {
            .config-page-card {
              padding: 1.5rem 1.25rem;
            }
            .config-page-header {
              flex-direction: column;
              align-items: flex-start;
            }
            .config-tabs {
              overflow-x: auto;
              flex-wrap: nowrap;
            }
            .config-form-row {
              flex-direction: column;
              align-items: stretch;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
