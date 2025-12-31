/**
 * Admin Login Client Component
* Admin-only login, validates ADMIN role and redirects to /admin
* Added internationalization support
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import Link from 'next/link';
import { useAdminI18n } from '@/contexts/adminI18nContext';

export default function AdminLoginClient() {
  const router = useRouter();
const { t, locale, setLocale } = useAdminI18n(); // 使用国际化
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(email, password);
      
// 验证用户角色必须是 ADMIN
      if (response.user?.role !== 'ADMIN' && response.user?.role !== 'admin') {
        setError(t('accessDenied'));
        setLoading(false);
        return;
      }
      
// 管理员登录成功，跳转到后台
      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message || t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="auth-card">
{/* 语言切换按钮 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '8px', border: '1px solid #ddd', borderRadius: '4px', padding: '4px' }}>
            <button
              type="button"
              onClick={() => setLocale('en')}
              style={{
                padding: '4px 12px',
                border: 'none',
                background: locale === 'en' ? '#ff1f3d' : 'transparent',
                color: locale === 'en' ? 'white' : '#666',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale('zh')}
              style={{
                padding: '4px 12px',
                border: 'none',
                background: locale === 'zh' ? '#ff1f3d' : 'transparent',
                color: locale === 'zh' ? 'white' : '#666',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              中文
            </button>
          </div>
        </div>
        <h1>{t('adminSignIn')}</h1>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '1.5rem' }}>
          {t('adminSignInDescription')}{' '}
          <Link href="/login" style={{ color: '#ff1f3d' }}>{t('signIn')}</Link>.
        </p>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label htmlFor="email">{t('emailLabel')} *</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">{t('passwordLabel')} *</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? t('signingIn') : t('signIn')}
          </button>
        </form>
        <div className="auth-links">
          <Link href="/login">{t('customerLogin')}</Link>
          <Link href="/forgot-password">{t('forgotPassword')}</Link>
        </div>
      </div>

      <style jsx>{`
        .container {
          max-width: 400px;
          margin: 4rem auto;
          padding: 0 1rem;
        }
        .auth-card {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }
        .btn-primary {
          width: 100%;
          padding: 0.75rem;
          background: #ff1f3d;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .error-message {
          color: #ff1f3d;
          padding: 0.75rem;
          background: #ffe5e5;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
        .auth-links {
          margin-top: 1.5rem;
          text-align: center;
          display: flex;
          justify-content: space-between;
        }
        .auth-links a {
          color: #ff1f3d;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}

