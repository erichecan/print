/**
 * Offline Orders Configuration Page
 * [2025-12-07 05:00:00] 线下订单配置管理页面（产品、颜色、尺码费用、可用性等）
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import Link from 'next/link';

export default function OfflineOrdersConfigPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null);

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

  if (authChecking) {
    return (
      <div className="config-page-shell">
        <div className="config-page-card">
          <p>正在检查权限...</p>
        </div>
      </div>
    );
  }

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

        <div className="config-page-content">
          <div className="config-section">
            <h2 className="config-section-title">产品管理</h2>
            <p className="config-section-desc">管理线下订单可用的产品列表</p>
            <Link href="/admin/products" target="_blank" className="config-link-btn">
              前往产品管理 →
            </Link>
          </div>

          <div className="config-section">
            <h2 className="config-section-title">颜色管理</h2>
            <p className="config-section-desc">管理产品可选的颜色列表</p>
            <Link href="/admin/offline-order-colors" target="_blank" className="config-link-btn">
              前往颜色管理 →
            </Link>
          </div>

          <div className="config-section">
            <h2 className="config-section-title">尺码费用配置</h2>
            <p className="config-section-desc">配置大尺码（2XL-5XL）的额外费用</p>
            <Link href="/admin/offline-order-size-fees" target="_blank" className="config-link-btn">
              前往尺码费用配置 →
            </Link>
          </div>

          <div className="config-section">
            <h2 className="config-section-title">可用性配置</h2>
            <p className="config-section-desc">配置产品-颜色-尺码组合的可用性</p>
            <Link href="/admin/offline-order-product-color-sizes" target="_blank" className="config-link-btn">
              前往可用性配置 →
            </Link>
          </div>

          <div className="config-section">
            <h2 className="config-section-title">工作流阶段配置</h2>
            <p className="config-section-desc">配置订单工作流的各个阶段</p>
            <Link href="/admin/settings" className="config-link-btn">
              系统设置 →
            </Link>
          </div>
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
            max-width: 1000px;
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
          .config-page-content {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
          }
          .config-section {
            padding: 1.5rem;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            background: #fafafa;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
          }
          .config-section:hover {
            border-color: #2563eb;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
          }
          .config-section-title {
            margin: 0 0 0.5rem;
            font-size: 1.1rem;
            font-weight: 600;
            color: #111827;
          }
          .config-section-desc {
            margin: 0 0 1rem;
            font-size: 0.875rem;
            color: #6b7280;
            line-height: 1.5;
          }
          .config-link-btn {
            display: inline-block;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.875rem;
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
          .config-section-info {
            margin: 0.75rem 0 0.5rem;
            font-size: 0.8rem;
            color: #4b5563;
          }
          .config-section-info code {
            padding: 0.2rem 0.4rem;
            background: #f3f4f6;
            border-radius: 4px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.75rem;
            color: #1f2937;
          }
          .config-section-note {
            margin: 0.5rem 0 0;
            font-size: 0.75rem;
            color: #9ca3af;
            font-style: italic;
          }
          @media (max-width: 768px) {
            .config-page-card {
              padding: 1.5rem 1.25rem;
            }
            .config-page-header {
              flex-direction: column;
              align-items: flex-start;
            }
            .config-page-content {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

