/**
 * Sales Offline Orders List Page
* Sales 查看自己线下订单列表
 */
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, salesOrdersApi, SalesOfflineOrderSummary } from '@/lib/api';
import api from '@/lib/api';
import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';

// 状态选择组件 - 参考 PillSelect 的单选版样式
function StatusSelector({
  orderId,
  currentValue,
  statusOptions,
  onUpdate,
  disabled,
}: {
  orderId: string;
  currentValue: string;
  statusOptions: Array<{ value: string; label: string }>;
  onUpdate: (orderId: string, value: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = `status-selector-${orderId}`;

  const currentLabel = statusOptions.find(o => o.value === currentValue)?.label ?? statusOptions[0]?.label ?? '';

  const handleSelect = (val: string) => {
    onUpdate(orderId, val);
    setOpen(false);
    triggerRef.current?.focus();
  };

  // 关闭逻辑：点击外部或按下 Escape
  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current && triggerRef.current.contains(target)) return;
      if (listRef.current && listRef.current.contains(target)) return;
      setOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // 键盘导航：上下选择，回车确认
  const onListKeyDown = (e: React.KeyboardEvent) => {
    const items = listRef.current?.querySelectorAll<HTMLLIElement>('[role="option"]');
    if (!items || items.length === 0) return;

    const active = document.activeElement as HTMLElement | null;
    const idx = Array.from(items).findIndex(el => el === active);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = items[idx + 1] ?? items[0];
      next.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = items[idx - 1] ?? items[items.length - 1];
      prev.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const val = (active?.dataset.value) as string | undefined;
      if (val) handleSelect(val);
    }
  };

  // 获取状态对应的颜色类
  const getStatusColorClass = (status: string) => {
    const lower = status.toLowerCase();
    if (lower === 'active' || lower === 'active_rush') {
      return 'bg-green-50 text-green-700';
    }
    if (lower === 'completed') {
      return 'bg-blue-50 text-blue-700';
    }
    if (lower === 'cancelled') {
      return 'bg-red-50 text-red-700';
    }
    return 'bg-indigo-50 text-indigo-700';
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        className={`
          inline-flex items-center justify-between gap-2
          rounded-xl border border-slate-300 bg-white px-3 py-2
          text-slate-900 shadow-sm
          focus:outline-none focus:ring-4 focus:ring-indigo-200
          disabled:opacity-60 disabled:cursor-not-allowed
          transition-all
        `}
        onClick={() => !disabled && setOpen(o => !o)}
      >
        <span className={`
          inline-flex items-center rounded-full
          text-sm px-3 py-1 font-medium
          ${getStatusColorClass(currentValue)}
        `}>
          {currentLabel}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && !disabled && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          tabIndex={-1}
          className="
            absolute z-20 mt-2 w-full min-w-[120px]
            rounded-xl border border-slate-200 bg-white
            shadow-lg p-1
          "
          onKeyDown={onListKeyDown}
        >
          {statusOptions.map((opt) => {
            const selected = opt.value === currentValue;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={selected}
                data-value={opt.value}
                tabIndex={0}
                className={`
                  cursor-pointer select-none rounded-lg px-3 py-2
                  text-sm text-slate-900
                  hover:bg-slate-100 focus:bg-slate-100 focus:outline-none
                  ${selected ? 'bg-indigo-50 text-indigo-700' : ''}
                `}
                onClick={() => handleSelect(opt.value)}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// 配置管理相关接口类型
interface Color {
  id: string;
  name: string;
  hexCode: string | null;
}

interface Product {
  id: string;
  name: string;
  imageUrl: string | null;
  isCustomerOwned: boolean;
}

// 尺码费用接口
interface SizeFee {
  id: string;
  size: string;
  additionalFee: number;
}

export default function SalesOrdersPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  // const [authChecking, setAuthChecking] = useState(true); // Using global auth loading
  const [orders, setOrders] = useState<SalesOfflineOrderSummary[]>([]);
  const [error, setError] = useState('');
  // const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null); // Using global auth user
  const [stages, setStages] = useState<Array<{ key: string; label: string }>>([]);
  const [updatingStage, setUpdatingStage] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);

  // 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(''); // Debounced value for API
  const [selectedCreator, setSelectedCreator] = useState('');
  const [creators, setCreators] = useState<Array<{ id: string; name: string; email: string }>>([]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load creators if manager
  useEffect(() => {
    // Only load if manager role
    // Check role is done in other effect, but we can check user object here
    const role = currentUser?.role ? String(currentUser.role).toUpperCase() : '';
    const isManagerRole = ['SALES_MANAGER', 'ADMIN'].includes(role);

    if (currentUser && isManagerRole) {
      salesOrdersApi.getCreators()
        .then(res => setCreators(res.data))
        .catch(err => console.error('Failed to load creators', err));
    }
  }, [currentUser]);

  // 在页面加载时打印构建版本信息，便于验证部署
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sha = process.env.NEXT_PUBLIC_BUILD_SHA || 'unknown';
    const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || 'unknown';
    // eslint-disable-next-line no-console
    console.log('[Frontend Build]', sha, buildTime);
    // eslint-disable-next-line no-console
    console.log('[Frontend Build Info]', {
      buildSha: sha,
      buildTime: buildTime,
      currentTime: new Date().toISOString(),
      page: 'offline-orders/sales/orders',
    });
  }, []);

  // Tab状态管理
  const [activeTab, setActiveTab] = useState<'orders' | 'config'>('orders');

  // 配置管理状态
  const [configTab, setConfigTab] = useState<'colors' | 'products' | 'size-fees'>('colors');
  const [colors, setColors] = useState<Color[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('');
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [editColorName, setEditColorName] = useState('');
  const [editColorHex, setEditColorHex] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductImageUrl, setNewProductImageUrl] = useState('');
  const [newProductIsCustomerOwned, setNewProductIsCustomerOwned] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [editProductImageUrl, setEditProductImageUrl] = useState('');
  const [editProductIsCustomerOwned, setEditProductIsCustomerOwned] = useState(false);

  // 尺码费用状态
  const [sizeFees, setSizeFees] = useState<SizeFee[]>([]);
  const [editingSizeFeeId, setEditingSizeFeeId] = useState<string | null>(null);
  const [editSizeFeeValue, setEditSizeFeeValue] = useState<string>('');

  // 订单状态选项
  // 添加 ACTIVE_RUSH 状态
  const statusOptions = [
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'ACTIVE_RUSH', label: 'ACTIVE (加急)' },
    { value: 'COMPLETED', label: 'COMPLETED' },
    { value: 'CANCELLED', label: 'CANCELLED' },
  ];


  // Auth Effect: Redirect if not logged in
  useEffect(() => {
    if (authLoading) return;

    // Check if user is logged in
    if (!currentUser) {
      router.replace('/offline-orders/sales/login');
      return;
    }

    // Check role permissions - simple check for sales related roles
    const role = currentUser.role ? String(currentUser.role).toUpperCase() : '';
    const isSales = ['SALES', 'SALES_MANAGER', 'ADMIN'].includes(role);

    if (!isSales) {
      router.replace('/offline-orders/sales/login');
      return;
    }
  }, [currentUser, authLoading, router]);

  // Fetch Stages once
  useEffect(() => {
    let cancelled = false;
    const loadStages = async () => {
      try {
        const { authenticatedFetch } = await import('@/lib/api');
        const stagesRes = await authenticatedFetch('/api/proxy/admin/offline-orders/config/stages')
          .then(res => res.ok ? res.json() : { stages: [] })
          .catch(() => ({ stages: [] }));
        if (!cancelled) setStages(stagesRes.stages || []);
      } catch (e) {
        console.warn('Failed to load stages:', e);
      }
    };
    if (currentUser) loadStages();
    return () => { cancelled = true; };
  }, [currentUser]);

  // Fetch Orders when status/filters change
  useEffect(() => {
    let cancelled = false;
    const fetchOrders = async () => {
      if (authLoading || !currentUser) return;

      setLoading(true);
      setError(''); // Clear error before fetch
      try {
        const response = await salesOrdersApi.list({
          page: 1,
          limit: 50,
          search: debouncedSearch,
          creatorId: selectedCreator || undefined
        });
        if (!cancelled) {
          setOrders(response.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || '加载订单列表失败，请稍后重试。');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (activeTab === 'orders') {
      fetchOrders();
    }
    return () => { cancelled = true; };
  }, [currentUser, authLoading, activeTab, debouncedSearch, selectedCreator]);

  const handleViewDetail = (orderId: string) => {
    router.push(`/offline-orders/sales/orders/${orderId}`);
  };

  // 删除订单
  const handleDeleteOrder = async (orderId: string, orderCode: string) => {
    // confirmation removed as per user request to avoid cancellation issues

    setDeletingOrder(orderId);
    try {
      await salesOrdersApi.delete(orderId);
      // 删除成功后刷新列表
      setOrders(orders.filter(o => o.id !== orderId));
      // alert('订单已删除'); // Alert might also be annoying or block, but user only complained about confirm dialog. Keeping alert for feedback or removing?
      // User said "click delete button, also has a dialog, maybe inexplicably clicked cancel".
      // Alert is technically a dialog but it's purely informational.
      // However, usually toast is better. For now I'll check if I should keep alert.
      // The user said "also remove all similar dialogs".
      // I'll keep the logic simple: just do it. I'll verify if I should remove alert too.
      // Standard practice: if no confirm, maybe show a toast or nothing.
      // I'll leave the alert('订单已删除') if not explicitly asked to remove success feedback,
      // but 'confirm' is blocking and requires choice.
      // Actually, if I remove confirm, I should probably use a non-blocking toast.
      // But let's just remove the confirm first.
    } catch (err: any) {
      alert(err.message || '删除失败，请稍后重试');
    } finally {
      setDeletingOrder(null);
    }
  };

  // 快速修改订单阶段
  const handleQuickUpdateStage = async (orderId: string, newStageKey: string) => {
    if (!newStageKey) return;

    setUpdatingStage(orderId);
    try {
      await salesOrdersApi.updateStage(orderId, { stageKey: newStageKey });
      // 刷新订单列表
      const response = await salesOrdersApi.list({ page: 1, limit: 50 });
      setOrders(response.data);
    } catch (err: any) {
      setError(err.message || '更新订单阶段失败。');
    } finally {
      setUpdatingStage(null);
    }
  };

  // 快速修改订单状态
  // 支持 ACTIVE_RUSH 状态
  const handleQuickUpdateStatus = async (orderId: string, newStatus: string) => {
    if (!newStatus) return;

    setUpdatingStatus(orderId);
    try {
      // 处理 ACTIVE_RUSH 状态
      let actualStatus: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
      let rushOrder: boolean | undefined;

      if (newStatus === 'ACTIVE_RUSH') {
        actualStatus = 'ACTIVE';
        rushOrder = true;
      } else {
        actualStatus = newStatus as 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
        // 如果从 ACTIVE_RUSH 切换到其他状态，取消加急标记
        rushOrder = false;
      }

      await salesOrdersApi.updateStatus(orderId, actualStatus, rushOrder);

      // 刷新订单列表
      const response = await salesOrdersApi.list({ page: 1, limit: 50 });
      setOrders(response.data);
    } catch (err: any) {
      setError(err.message || '更新订单状态失败。');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const isManager = currentUser?.role && ['SALES_MANAGER', 'ADMIN'].includes(String(currentUser.role).toUpperCase());

  // 配置管理数据获取
  // 修复：使用 authenticatedFetch 确保 token 正确传递
  const { data: colorsData, mutate: mutateColors } = useSWR(
    activeTab === 'config' && configTab === 'colors' ? '/api/proxy/admin/offline-order-colors' : null,
    async (url) => {
      const { authenticatedFetch } = await import('@/lib/api');
      const response = await authenticatedFetch(url);
      if (!response.ok) throw new Error('Failed to fetch colors');
      return response.json();
    }
  );

  // 修复：使用 authenticatedFetch 确保 token 正确传递
  const { data: productsData, mutate: mutateProducts } = useSWR(
    activeTab === 'config' && configTab === 'products' ? '/api/proxy/admin/offline-order-products' : null,
    async (url) => {
      const { authenticatedFetch } = await import('@/lib/api');
      const response = await authenticatedFetch(url);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    }
  );

  useEffect(() => {
    if (colorsData?.data) {
      setColors(colorsData.data);
    }
  }, [colorsData]);

  useEffect(() => {
    if (productsData?.data) {
      setProducts(productsData.data);
    }
  }, [productsData]);

  // 尺码费用SWR
  const { data: sizeFeesData, mutate: mutateSizeFees } = useSWR(
    activeTab === 'config' && configTab === 'size-fees' ? '/api/proxy/admin/offline-order-size-fees' : null,
    async (url) => {
      const { authenticatedFetch } = await import('@/lib/api');
      const response = await authenticatedFetch(url);
      if (!response.ok) throw new Error('Failed to fetch size fees');
      return response.json();
    }
  );

  useEffect(() => {
    if (sizeFeesData?.data) {
      setSizeFees(sizeFeesData.data);
    }
  }, [sizeFeesData]);

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
    // confirmation removed
    try {
      await api(`/api/proxy/admin/offline-order-colors/${id}`, { method: 'DELETE' });
      mutateColors();
    } catch (err: any) {
      alert(err.message || '删除失败');
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
    // confirmation removed
    try {
      await api(`/api/proxy/admin/offline-order-products/${id}`, { method: 'DELETE' });
      mutateProducts();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  // 尺码费用管理函数
  const handleUpdateSizeFee = async (id: string, size: string) => {
    const fee = parseFloat(editSizeFeeValue);
    if (isNaN(fee) || fee < 0) {
      alert('请输入有效的金额');
      return;
    }

    try {
      // Using bulk update for single item for simplicity as per API design, or creating specific endpoint if needed.
      // Based on controller, it accepts array of sizeFees.
      await api('/api/proxy/admin/offline-order-size-fees', {
        method: 'PATCH',
        body: {
          sizeFees: [{ size, additionalFee: fee }]
        }
      });
      setEditingSizeFeeId(null);
      mutateSizeFees();
    } catch (err: any) {
      alert(err.message || '更新失败');
    }
  };

  if (authLoading) {
    return (
      <div className="sales-orders-shell">
        <div className="sales-orders-card">
          <p>正在检查登录状态...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-orders-shell">
      <div className="sales-orders-card">
        <header className="sales-orders-header">
          <div>
            <h1>Sales 线下订单管理</h1>
            <p>在这里查看你创建的线下订单（主管可查看全部订单）。</p>
          </div>
          <div className="sales-orders-header-actions">
            {/* 顶部导航按钮 - 放在新建订单按钮旁边 */}
            <button
              type="button"
              className="sales-orders-nav-btn sales-orders-nav-btn-secondary"
              onClick={() => window.open('/', '_blank')}
            >
              返回主站
            </button>
            <button
              type="button"
              className="sales-orders-nav-btn sales-orders-nav-btn-primary"
              onClick={() => router.push('/admin/offline-orders')}
            >
              进入主站管理后台
            </button>
            <button
              type="button"
              className="sales-orders-new"
              onClick={() => window.open('/offline-orders', '_blank')}
            >
              新建线下订单
            </button>
          </div>
        </header>

        {/* Tab切换 */}
        <div className="sales-orders-tabs">
          <button
            type="button"
            className={`sales-orders-tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            订单列表
          </button>
          {isManager && (
            <button
              type="button"
              className={`sales-orders-tab ${activeTab === 'config' ? 'active' : ''}`}
              onClick={() => setActiveTab('config')}
            >
              配置管理
            </button>
          )}
        </div>

        {error && <div className="sales-orders-error">{error}</div>}

        {/* 订单列表Tab内容 */}
        {activeTab === 'orders' && (
          <div className="sales-orders-tab-content">

            {/* 筛选工具栏 */}
            <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex-1 w-full md:w-auto">
                <label htmlFor="search" className="sr-only">搜索</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="2 2 16 16" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="search"
                    id="search"
                    className="pl-10 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md py-2"
                    placeholder="搜索订单号、客户、项目..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {isManager && (
                <div className="w-full md:w-64">
                  <select
                    id="creator-filter"
                    name="creator-filter"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
                    value={selectedCreator}
                    onChange={(e) => setSelectedCreator(e.target.value)}
                  >
                    <option value="">所有创建者</option>
                    {creators.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {loading ? (
              <p>正在加载订单...</p>
            ) : orders.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <p className="text-slate-500">
                  {(searchQuery || selectedCreator) ? '没有找到匹配的线下订单' : '当前还没有线下订单。'}
                </p>
                {(searchQuery || selectedCreator) && (
                  <button
                    className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    onClick={() => { setSearchQuery(''); setSelectedCreator(''); }}
                  >
                    清除筛选条件
                  </button>
                )}
              </div>
            ) : (
              <table className="sales-orders-table">
                <thead>
                  <tr>
                    <th>订单编号</th>
                    <th>项目名称</th>
                    <th>客户</th>
                    {isManager && <th>创建者</th>}
                    <th>数量</th>
                    <th>交付日期</th>
                    <th>状态</th>
                    <th>阶段</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.orderCode}</td>
                      <td>{order.projectName}</td>
                      <td>
                        <div className="sales-orders-contact">
                          <span>{order.contact.name}</span>
                          <span className="sales-orders-contact-sub">
                            {order.contact.company || order.contact.email}
                          </span>
                        </div>
                      </td>
                      {isManager && (
                        <td>
                          {order.creator ? (
                            <div className="sales-orders-creator">
                              <span>{order.creator.name}</span>
                              <span className="sales-orders-creator-sub">{order.creator.email}</span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                      )}
                      <td>{order.quantity ?? '—'}</td>
                      <td>{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <StatusSelector
                            orderId={order.id}
                            currentValue={order.status}
                            statusOptions={statusOptions}
                            onUpdate={handleQuickUpdateStatus}
                            disabled={updatingStatus === order.id}
                          />
                          {order.rushOrder && (
                            <span className="tag tag-rush">加急</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="sales-orders-stage">
                          {stages.length > 0 ? (
                            <select
                              value={order.stage?.key || ''}
                              onChange={(e) => handleQuickUpdateStage(order.id, e.target.value)}
                              disabled={updatingStage === order.id}
                              className="sales-orders-stage-select"
                            >
                              <option value="">—</option>
                              {stages.map((stage) => (
                                <option key={stage.key} value={stage.key}>
                                  {stage.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span>{order.stage?.label || '—'}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="sales-orders-detail-btn-small"
                            onClick={() => handleViewDetail(order.id)}
                          >
                            详情
                          </button>
                          <button
                            type="button"
                            className="sales-orders-delete-btn"
                            onClick={() => handleDeleteOrder(order.id, order.orderCode)}
                            disabled={deletingOrder === order.id}
                            title="删除订单"
                          >
                            {deletingOrder === order.id ? '删除中...' : '🗑️'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 配置管理Tab内容 */}
        {activeTab === 'config' && isManager && (
          <div className="sales-orders-tab-content">
            <div className="config-sub-tabs">
              <button
                type="button"
                className={`config-sub-tab ${configTab === 'colors' ? 'active' : ''}`}
                onClick={() => setConfigTab('colors')}
              >
                颜色管理
              </button>
              <button
                type="button"
                className={`config-sub-tab ${configTab === 'products' ? 'active' : ''}`}
                onClick={() => setConfigTab('products')}
              >
                产品管理
              </button>
              <button
                type="button"
                className={`config-sub-tab ${configTab === 'size-fees' ? 'active' : ''}`}
                onClick={() => setConfigTab('size-fees')}
              >
                尺码价格
              </button>
            </div>

            {configTab === 'colors' && (
              <div className="config-tab-panel">
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

            {configTab === 'products' && (
              <div className="config-tab-panel">
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
                              /* eslint-disable-next-line @next/next/no-img-element */
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

            {configTab === 'size-fees' && (
              <div className="config-tab-panel">
                <h2>尺码价格管理</h2>
                <p className="config-desc">配置不同尺码的额外费用（基础尺码无额外费用）</p>

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
                      {sizeFees.map((fee) => (
                        <tr key={fee.id}>
                          <td style={{ fontWeight: 'bold' }}>{fee.size}</td>
                          <td>
                            {editingSizeFeeId === fee.id ? (
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ marginRight: '4px' }}>$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editSizeFeeValue}
                                  onChange={(e) => setEditSizeFeeValue(e.target.value)}
                                  className="config-input-inline"
                                  style={{ width: '100px' }}
                                />
                              </div>
                            ) : (
                              `$${fee.additionalFee.toFixed(2)}`
                            )}
                          </td>
                          <td>
                            {editingSizeFeeId === fee.id ? (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  onClick={() => handleUpdateSizeFee(fee.id, fee.size)}
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
                                  setEditingSizeFeeId(fee.id);
                                  setEditSizeFeeValue(fee.additionalFee.toString());
                                }}
                                className="config-btn config-btn-secondary"
                              >
                                编辑
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {sizeFees.length === 0 && (
                        <tr><td colSpan={3} style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>未配置尺码费用</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .sales-orders-shell {
          min-height: 100vh;
          padding: 2rem 1rem;
          background: radial-gradient(circle at top, #e0f2fe, #f9fafb);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .sales-orders-card {
          width: 100%;
          max-width: 1200px;
          background: #ffffff;
          border-radius: 18px;
          padding: 1.75rem 1.5rem;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);
        }
        .sales-orders-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .sales-orders-header-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
        }
/* 顶部导航按钮样式 - 确保显示和圆角 */
        .sales-orders-nav-btn {
          border: none !important;
          border-radius: 999px !important;
          padding: 0.6rem 1.3rem !important;
          font-size: 0.9rem !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          white-space: nowrap !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .sales-orders-nav-btn-primary {
          color: #2563eb !important;
          background: #eff6ff !important;
        }
        .sales-orders-nav-btn-primary:hover {
          background: #dbeafe !important;
          color: #1d4ed8 !important;
        }
        .sales-orders-nav-btn-secondary {
          color: #4b5563 !important;
          background: #f3f4f6 !important;
        }
        .sales-orders-nav-btn-secondary:hover {
          background: #e5e7eb !important;
          color: #1f2937 !important;
        }
/* Tab样式 */
        .sales-orders-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid #e5e7eb;
        }
        .sales-orders-tab {
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
        .sales-orders-tab:hover {
          color: #2563eb;
        }
        .sales-orders-tab.active {
          color: #2563eb;
          border-bottom-color: #2563eb;
        }
        .sales-orders-tab-content {
          min-height: 400px;
        }
/* 配置管理样式 */
        .config-sub-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          border-bottom: 2px solid #e5e7eb;
        }
        .config-sub-tab {
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
        .config-sub-tab:hover {
          color: #2563eb;
        }
        .config-sub-tab.active {
          color: #2563eb;
          border-bottom-color: #2563eb;
        }
        .config-tab-panel h2 {
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
          flex-wrap: wrap;
        }
        .config-input {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.95rem;
          flex: 1;
          min-width: 200px;
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
        .sales-orders-header h1 {
          margin: 0 0 0.4rem;
          font-size: 1.4rem;
          font-weight: 700;
        }
        .sales-orders-header p {
          margin: 0;
          font-size: 0.9rem;
          color: #6b7280;
        }
        .sales-orders-new {
          border: none;
          border-radius: 999px;
          padding: 0.6rem 1.3rem;
          font-size: 0.9rem;
          font-weight: 600;
          background: linear-gradient(135deg, #16a34a, #15803d);
          color: #ffffff;
          cursor: pointer;
        }
        .sales-orders-error {
          margin-bottom: 1rem;
          padding: 0.75rem 0.9rem;
          border-radius: 0.75rem;
          background: #fef2f2;
          color: #b91c1c;
          font-size: 0.9rem;
        }
        .sales-orders-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .sales-orders-table th,
        .sales-orders-table td {
          padding: 0.6rem 0.5rem;
          border-bottom: 1px solid #e5e7eb;
          text-align: left;
        }
        .sales-orders-table th {
          font-weight: 600;
          color: #4b5563;
          background: #f9fafb;
        }
        .sales-orders-contact {
          display: flex;
          flex-direction: column;
        }
        .sales-orders-contact-sub {
          font-size: 0.8rem;
          color: #6b7280;
        }
        .sales-orders-creator {
          display: flex;
          flex-direction: column;
        }
        .sales-orders-creator-sub {
          font-size: 0.8rem;
          color: #6b7280;
        }
        .sales-orders-stage {
          display: flex;
          align-items: center;
        }
        .sales-orders-stage-select {
          padding: 0.25rem 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.85rem;
          background: #ffffff;
          cursor: pointer;
          min-width: 120px;
        }
        .sales-orders-stage-select:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .sales-orders-stage-select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }
/* StatusSelector 样式已迁移到 Tailwind CSS */
/* 添加 fallback 样式确保圆角正确显示 */
        button[aria-haspopup="listbox"] {
          border-radius: 0.75rem !important; /* rounded-xl fallback */
        }
        button[aria-haspopup="listbox"] > span[class*="rounded-full"] {
          border-radius: 9999px !important; /* rounded-full fallback */
        }
        ul[role="listbox"] {
          border-radius: 0.75rem !important; /* rounded-xl fallback */
        }
        ul[role="listbox"] > li {
          border-radius: 0.5rem !important; /* rounded-lg fallback */
        }
        .tag-active-rush {
          background: #fef3c7;
          color: #b45309;
        }
        .tag {
          display: inline-flex;
          align-items: center;
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-right: 0.25rem;
        }
        .tag-active {
          background: #ecfdf3;
          color: #15803d;
        }
        .tag-completed {
          background: #eff6ff;
          color: #1d4ed8;
        }
        .tag-cancelled {
          background: #fef2f2;
          color: #b91c1c;
        }
        .tag-rush {
          background: #fef3c7;
          color: #b45309;
        }
        .sales-orders-detail-btn-small {
          border: none;
          border-radius: 6px;
          padding: 0.25rem 0.6rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #2563eb;
          background: #eff6ff;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .sales-orders-detail-btn-small:hover {
          background: #dbeafe;
          color: #1d4ed8;
        }
        .sales-orders-delete-btn {
          border: none;
          border-radius: 6px;
          padding: 0.25rem 0.5rem;
          font-size: 0.9rem;
          background: #fef2f2;
          color: #dc2626;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 28px;
        }
        .sales-orders-delete-btn:hover:not(:disabled) {
          background: #fee2e2;
          color: #b91c1c;
        }
        .sales-orders-delete-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        @media (max-width: 768px) {
          .sales-orders-card {
            padding: 1.5rem 1rem;
          }
          .sales-orders-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .sales-orders-table {
            display: block;
            overflow-x: auto;
          }
          .sales-orders-tabs {
            overflow-x: auto;
            flex-wrap: nowrap;
          }
          .config-sub-tabs {
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
  );
}


