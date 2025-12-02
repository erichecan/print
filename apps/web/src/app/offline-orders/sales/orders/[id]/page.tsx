/**
 * Sales Offline Order Detail Page
 * [2025-12-02 04:54:00] Sales 查看单个线下订单详情
 */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authApi, salesOrdersApi, SalesOfflineOrderDetail } from '@/lib/api';

export default function SalesOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string | undefined;

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<SalesOfflineOrderDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const me = await authApi.me().catch(() => null);
        const role = me?.role ? String(me.role).toUpperCase() : '';
        const isSales = ['SALES', 'SALES_MANAGER', 'ADMIN'].includes(role);

        if (!me || !isSales) {
          router.replace('/offline-orders/sales/login');
          return;
        }
      } catch {
        router.replace('/offline-orders/sales/login');
        return;
      } finally {
        if (!cancelled) {
          setAuthChecking(false);
        }
      }

      try {
        const detail = await salesOrdersApi.get(orderId);
        if (!cancelled) {
          setOrder(detail);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || '加载订单详情失败。');
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
  }, [orderId, router]);

  if (authChecking) {
    return (
      <div className="sales-order-shell">
        <div className="sales-order-card">
          <p>正在检查登录状态...</p>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    router.push('/offline-orders/sales/orders');
  };

  const meta = order;

  return (
    <div className="sales-order-shell">
      <div className="sales-order-card">
        <header className="sales-order-header">
          <div>
            <button type="button" className="sales-order-back" onClick={handleBack}>
              ← 返回列表
            </button>
            <h1>线下订单详情</h1>
            {meta && (
              <p>
                订单编号：<strong>{meta.orderCode}</strong>
              </p>
            )}
          </div>
        </header>

        {error && <div className="sales-order-error">{error}</div>}

        {loading || !meta ? (
          <p>正在加载订单详情...</p>
        ) : (
          <div className="sales-order-grid">
            <section>
              <h2>基本信息</h2>
              <dl>
                <div>
                  <dt>项目名称</dt>
                  <dd>{meta.projectName}</dd>
                </div>
                <div>
                  <dt>主要产品</dt>
                  <dd>{meta.primaryProduct || '—'}</dd>
                </div>
                <div>
                  <dt>数量</dt>
                  <dd>{meta.quantity ?? '—'}</dd>
                </div>
                <div>
                  <dt>交付日期</dt>
                  <dd>{meta.deliveryDate ? new Date(meta.deliveryDate).toLocaleDateString() : '—'}</dd>
                </div>
                <div>
                  <dt>状态</dt>
                  <dd>
                    <span className={`tag tag-${meta.status.toLowerCase()}`}>{meta.status}</span>
                    {meta.rushOrder && <span className="tag tag-rush">加急</span>}
                  </dd>
                </div>
                <div>
                  <dt>阶段</dt>
                  <dd>{meta.stage?.label || '—'}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h2>客户信息</h2>
              <dl>
                <div>
                  <dt>联系人</dt>
                  <dd>{meta.contact.name}</dd>
                </div>
                <div>
                  <dt>公司</dt>
                  <dd>{meta.contact.company || '—'}</dd>
                </div>
                <div>
                  <dt>邮箱</dt>
                  <dd>{meta.contact.email}</dd>
                </div>
                <div>
                  <dt>电话</dt>
                  <dd>{meta.contact.phone || '—'}</dd>
                </div>
              </dl>
            </section>

            <section className="sales-order-wide">
              <h2>生产信息</h2>
              {meta.productionWorkOrder ? (
                <dl>
                  <div>
                    <dt>工单编号</dt>
                    <dd>{meta.productionWorkOrder.workOrderCode}</dd>
                  </div>
                  <div>
                    <dt>生产状态</dt>
                    <dd>{meta.productionWorkOrder.status}</dd>
                  </div>
                  <div>
                    <dt>负责人</dt>
                    <dd>{meta.productionWorkOrder.assignee?.name || '—'}</dd>
                  </div>
                  <div>
                    <dt>计划开始</dt>
                    <dd>
                      {meta.productionWorkOrder.startDate
                        ? new Date(meta.productionWorkOrder.startDate).toLocaleDateString()
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>计划完成</dt>
                    <dd>
                      {meta.productionWorkOrder.dueDate
                        ? new Date(meta.productionWorkOrder.dueDate).toLocaleDateString()
                        : '—'}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p>该订单尚未创建生产工单。</p>
              )}
            </section>
          </div>
        )}
      </div>

      <style jsx>{`
        .sales-order-shell {
          min-height: 100vh;
          padding: 2rem 1rem;
          background: radial-gradient(circle at top, #e0f2fe, #f9fafb);
          display: flex;
          justify-content: center;
        }
        .sales-order-card {
          width: 100%;
          max-width: 1100px;
          background: #ffffff;
          border-radius: 18px;
          padding: 1.75rem 1.5rem;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);
        }
        .sales-order-header h1 {
          margin: 0.5rem 0 0.25rem;
          font-size: 1.4rem;
          font-weight: 700;
        }
        .sales-order-header p {
          margin: 0;
          font-size: 0.9rem;
          color: #6b7280;
        }
        .sales-order-back {
          border: none;
          background: transparent;
          color: #2563eb;
          font-size: 0.9rem;
          cursor: pointer;
          padding: 0;
        }
        .sales-order-error {
          margin-top: 1rem;
          padding: 0.75rem 0.9rem;
          border-radius: 0.75rem;
          background: #fef2f2;
          color: #b91c1c;
          font-size: 0.9rem;
        }
        .sales-order-grid {
          margin-top: 1.5rem;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.5rem;
        }
        .sales-order-grid section {
          border-radius: 1rem;
          border: 1px solid #e5e7eb;
          padding: 1rem 1rem;
          background: #f9fafb;
        }
        .sales-order-grid h2 {
          margin: 0 0 0.75rem;
          font-size: 1rem;
          font-weight: 600;
        }
        dl {
          margin: 0;
        }
        dl > div {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.35rem 0;
          border-bottom: 1px dashed #e5e7eb;
        }
        dl > div:last-child {
          border-bottom: none;
        }
        dt {
          font-size: 0.85rem;
          color: #6b7280;
        }
        dd {
          margin: 0;
          font-size: 0.9rem;
          color: #111827;
          text-align: right;
        }
        .sales-order-wide {
          grid-column: 1 / -1;
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
        @media (max-width: 768px) {
          .sales-order-card {
            padding: 1.5rem 1rem;
          }
          .sales-order-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}


