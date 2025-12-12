/**
 * Account Breadcrumb Component
 * [2025-01-27 14:45:00] 账户页面面包屑导航组件
 */
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ACCOUNT_ROUTES } from '@/lib/routes/account';

const LABEL_MAP: Record<string, string> = {
  '': '我的账户',
  orders: '订单',
  billing: '账单与发票',
  'payment-methods': '支付方式',
  addresses: '地址簿',
  profile: '个人资料',
  team: '团队',
  assets: '素材库',
  notifications: '通知设置',
  support: '支持与工单',
  rewards: '折扣与积分',
  designs: '我的设计',
  settings: '账户设置',
};

export function AccountBreadcrumb() {
  const pathname = usePathname();
  const path = pathname.replace(/^\/account/, '').split('/').filter(Boolean);
  
  const trail = [
    { label: '我的账户', href: ACCOUNT_ROUTES.dashboard },
    ...path.map((segment, index) => {
      const href = `/account/${path.slice(0, index + 1).join('/')}`;
      return {
        label: LABEL_MAP[segment] || segment,
        href,
      };
    }),
  ];

  return (
    <div style={{ 
      fontSize: '14px', 
      color: '#666',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      {trail.map((item, index) => (
        <span key={item.href}>
          {index > 0 && <span style={{ margin: '0 8px', color: '#999' }}>/</span>}
          {index === trail.length - 1 ? (
            <span style={{ color: '#1f2937', fontWeight: 500 }}>{item.label}</span>
          ) : (
            <Link 
              href={item.href}
              style={{ 
                color: '#2563eb', 
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </div>
  );
}
