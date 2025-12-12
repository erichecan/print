/**
 * Account Not Found Page
 * [2025-01-27 15:05:00] 账户页面 404 处理组件
 */
import Link from 'next/link';
import { ACCOUNT_ROUTES } from '@/lib/routes/account';

export default function AccountNotFound() {
  return (
    <div style={{
      padding: '48px',
      textAlign: 'center',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 600,
        marginBottom: '16px',
        color: '#1f2937',
      }}>
        内容未找到
      </h2>
      <p style={{
        fontSize: '16px',
        color: '#666',
        marginBottom: '24px',
      }}>
        请检查链接或返回账户概览。
      </p>
      <Link
        href={ACCOUNT_ROUTES.dashboard}
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: '#2563eb',
          color: '#ffffff',
          textDecoration: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          fontWeight: 500,
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#1d4ed8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#2563eb';
        }}
      >
        返回我的账户
      </Link>
    </div>
  );
}
