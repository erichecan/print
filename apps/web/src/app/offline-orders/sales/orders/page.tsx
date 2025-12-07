/**
 * Sales Offline Orders List Page
 * [2025-12-02 04:52:00] Sales 查看自己线下订单列表
 */
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, salesOrdersApi, SalesOfflineOrderSummary } from '@/lib/api';

// [2025-12-07 06:20:00] 状态选择组件 - 圆角标签 + 下拉箭头
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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const currentOption = statusOptions.find(opt => opt.value === currentValue) || statusOptions[0];
  const getStatusClass = (status: string) => {
    const lower = status.toLowerCase();
    if (lower === 'active') return 'active';
    if (lower === 'completed') return 'completed';
    if (lower === 'cancelled') return 'cancelled';
    return lower;
  };

  return (
    <div className="sales-orders-status-selector" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`status-tag status-tag-${getStatusClass(currentValue)}`}
      >
        {currentOption.label}
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 12 12" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          style={{ marginLeft: '0.375rem', transition: 'transform 0.2s' }}
          className={isOpen ? 'arrow-open' : ''}
        >
          <path d="M3 4.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen && (
        <div className="status-dropdown-menu">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onUpdate(orderId, option.value);
                setIsOpen(false);
              }}
              className={`status-menu-item ${currentValue === option.value ? 'active' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SalesOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [orders, setOrders] = useState<SalesOfflineOrderSummary[]>([]);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null);
  const [stages, setStages] = useState<Array<{ key: string; label: string }>>([]);
  const [updatingStage, setUpdatingStage] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // [2025-12-07 05:15:00] 订单状态选项
  const statusOptions = [
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'COMPLETED', label: 'COMPLETED' },
    { value: 'CANCELLED', label: 'CANCELLED' },
  ];


  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        // [2025-12-02 04:52:00] 先检查当前登录用户及角色
        const me = await authApi.me().catch(() => null);
        const role = me?.role ? String(me.role).toUpperCase() : '';
        const isSales = ['SALES', 'SALES_MANAGER', 'ADMIN'].includes(role);

        if (!me || !isSales) {
          router.replace('/offline-orders/sales/login');
          return;
        }

        if (!cancelled) {
          setCurrentUser(me);
        }

        // [2025-12-07 04:55:00] 获取阶段配置（用于快速修改状态）
        // [2025-12-07 05:30:00] 使用代理 API 访问，确保认证正确传递
        try {
          const stagesRes = await fetch('/api/proxy/admin/offline-orders/config/stages', {
            credentials: 'include',
          })
            .then(res => {
              if (!res.ok) {
                console.warn('[SalesOrders] Failed to fetch stages:', res.status);
                return { stages: [] };
              }
              return res.json();
            })
            .catch(() => ({ stages: [] }));
          if (!cancelled) {
            setStages(stagesRes.stages || []);
          }
        } catch (e) {
          console.warn('Failed to load stages:', e);
        }
      } catch (e) {
        router.replace('/offline-orders/sales/login');
        return;
      } finally {
        if (!cancelled) {
          setAuthChecking(false);
        }
      }

      try {
        const response = await salesOrdersApi.list({ page: 1, limit: 50 });
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

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleViewDetail = (orderId: string) => {
    router.push(`/offline-orders/sales/orders/${orderId}`);
  };

  // [2025-12-07 04:55:00] 快速修改订单阶段
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

  // [2025-12-07 05:15:00] 快速修改订单状态
  const handleQuickUpdateStatus = async (orderId: string, newStatus: string) => {
    if (!newStatus) return;
    
    setUpdatingStatus(orderId);
    try {
      const actualStatus = newStatus as 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
      // [2025-12-07 06:00:00] 更新状态时，保持原有的加急标记不变
      await salesOrdersApi.updateStatus(orderId, actualStatus);
      
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

  if (authChecking) {
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
            <h1>Sales 线下订单列表</h1>
            <p>在这里查看你创建的线下订单（主管可查看全部订单）。</p>
          </div>
          <div className="sales-orders-header-actions">
            {isManager && (
              <button
                type="button"
                className="sales-orders-config-btn"
                onClick={() => router.push('/admin/offline-orders/config')}
              >
                配置管理
              </button>
            )}
            <button
              type="button"
              className="sales-orders-new"
              onClick={() => window.open('/offline-orders', '_blank')}
            >
              新建线下订单
            </button>
          </div>
        </header>

        {error && <div className="sales-orders-error">{error}</div>}

        {loading ? (
          <p>正在加载订单...</p>
        ) : orders.length === 0 ? (
          <p>当前还没有线下订单。</p>
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
                    <button
                      type="button"
                      className="sales-orders-detail-btn"
                      onClick={() => handleViewDetail(order.id)}
                    >
                      详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        .sales-orders-shell {
          min-height: 100vh;
          padding: 2rem 1rem;
          background: radial-gradient(circle at top, #e0f2fe, #f9fafb);
          display: flex;
          justify-content: center;
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
        }
        .sales-orders-config-btn {
          border: none;
          border-radius: 999px;
          padding: 0.6rem 1.3rem;
          font-size: 0.9rem;
          font-weight: 600;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: #ffffff;
          cursor: pointer;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        .sales-orders-config-btn:hover {
          box-shadow: 0 8px 20px rgba(124, 58, 237, 0.3);
          transform: translateY(-1px);
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
        .sales-orders-status-selector {
          position: relative;
          display: inline-block;
        }
        .status-tag {
          display: inline-flex;
          align-items: center;
          padding: 0.375rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          user-select: none;
        }
        .status-tag:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .status-tag:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .status-tag-active {
          background: #dcfce7;
          color: #166534;
        }
        .status-tag-completed {
          background: #eff6ff;
          color: #1d4ed8;
        }
        .status-tag-cancelled {
          background: #fef2f2;
          color: #b91c1c;
        }
        .status-tag .arrow-open {
          transform: rotate(180deg);
        }
        .status-dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 0.25rem;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 100;
          min-width: 140px;
          overflow: hidden;
        }
        .status-menu-item {
          display: block;
          width: 100%;
          padding: 0.5rem 1rem;
          text-align: left;
          background: transparent;
          border: none;
          color: #374151;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.15s;
        }
        .status-menu-item:hover {
          background: #f3f4f6;
        }
        .status-menu-item.active {
          background: #eff6ff;
          color: #1d4ed8;
          font-weight: 500;
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
        .sales-orders-detail-btn {
          border: none;
          border-radius: 999px;
          padding: 0.35rem 0.9rem;
          font-size: 0.82rem;
          font-weight: 600;
          color: #2563eb;
          background: #eff6ff;
          cursor: pointer;
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
        }
      `}</style>
    </div>
  );
}


