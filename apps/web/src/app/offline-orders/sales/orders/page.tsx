/**
 * Sales Offline Orders List Page
 * [2025-12-02 04:52:00] Sales 查看自己线下订单列表
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, salesOrdersApi, SalesOfflineOrderSummary } from '@/lib/api';

export default function SalesOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [orders, setOrders] = useState<SalesOfflineOrderSummary[]>([]);
  const [error, setError] = useState('');

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
          <button
            type="button"
            className="sales-orders-new"
            onClick={() => router.push('/offline-orders')}
          >
            新建线下订单
          </button>
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
                <th>数量</th>
                <th>交付日期</th>
                <th>状态</th>
                <th>优先级</th>
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
                  <td>{order.quantity ?? '—'}</td>
                  <td>{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : '—'}</td>
                  <td>
                    <span className={`tag tag-${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                    {order.rushOrder && <span className="tag tag-rush">加急</span>}
                  </td>
                  <td>{order.stage?.label || '—'}</td>
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


