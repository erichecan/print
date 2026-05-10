/**
 * Sales Login Page
* 线下订单 Sales 登录入口，复用通用登录逻辑
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function SalesLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);

// Use global auth context to update state after login
  const { refresh } = useAuth();

  const isDbColdStartError = (message: string) =>
    /database connection error|database.*connect|connecting/i.test(message);

  const attemptLogin = async (email: string, password: string, retryLeft = 2): Promise<Awaited<ReturnType<typeof authApi.login>>> => {
    try {
      return await authApi.login(email, password);
    } catch (err: any) {
      if (retryLeft > 0 && isDbColdStartError(err.message || '')) {
        const wait = (4 - retryLeft) * 3;
        setError(`服务正在启动中，将在 ${wait} 秒后自动重试...`);
        setRetryCountdown(wait);
        await new Promise<void>(resolve => {
          let remaining = wait;
          const timer = setInterval(() => {
            remaining -= 1;
            setRetryCountdown(remaining);
            if (remaining <= 0) { clearInterval(timer); resolve(); }
          }, 1000);
        });
        setError('');
        return attemptLogin(email, password, retryLeft - 1);
      }
      if (isDbColdStartError(err.message || '')) {
        throw new Error('服务启动较慢，请稍候片刻后再试。');
      }
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await attemptLogin(email, password);
      const role = String(response.user?.role || '').toUpperCase();

// 仅允许 SALES / SALES_MANAGER / ADMIN 进入 Sales 区域
      if (!['SALES', 'SALES_MANAGER', 'ADMIN'].includes(role)) {
        setError('当前账号没有 Sales 权限，请联系管理员开通。');
        setLoading(false);
        return;
      }

// Valid login, refresh global auth state so AuthProvider knows we are logged in
      await refresh();

      router.push('/offline-orders/sales/orders');
      router.refresh();
    } catch (err: any) {
      setError(err.message || '登录失败，请检查邮箱和密码。');
    } finally {
      if (loading) setLoading(false);
    }
  };

  return (
    <div className="sales-login-container">
      <div className="sales-login-card">
        <h1 className="sales-login-title">Sales 登录</h1>
        <p className="sales-login-subtitle">用于管理线下订单的销售专用入口</p>
        <form onSubmit={handleSubmit}>
          {error && <div className="sales-login-error">{error}</div>}
          <div className="sales-login-field">
            <label htmlFor="sales-email">邮箱 *</label>
            <input
              id="sales-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="sales-login-field">
            <label htmlFor="sales-password">密码 *</label>
            <input
              id="sales-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="sales-login-button">
            {retryCountdown > 0 ? `重试中 (${retryCountdown}s)...` : loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .sales-login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          background: radial-gradient(circle at top, #fef3c7, #f9fafb);
        }
        .sales-login-card {
          width: 100%;
          max-width: 420px;
          background: #ffffff;
          border-radius: 16px;
          padding: 2.5rem 2rem;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.15);
        }
        .sales-login-title {
          margin: 0 0 0.5rem;
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          text-align: center;
        }
        .sales-login-subtitle {
          margin: 0 0 2rem;
          font-size: 0.9rem;
          color: #6b7280;
          text-align: center;
        }
        .sales-login-field {
          margin-bottom: 1.25rem;
        }
        .sales-login-field label {
          display: block;
          margin-bottom: 0.4rem;
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
        }
        .sales-login-field input {
          width: 100%;
          padding: 0.7rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid #d1d5db;
          font-size: 0.95rem;
        }
        .sales-login-field input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
        }
        .sales-login-button {
          width: 100%;
          margin-top: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: 999px;
          border: none;
          font-size: 0.95rem;
          font-weight: 600;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #ffffff;
          cursor: pointer;
          transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.2s ease;
        }
        .sales-login-button:hover:not(:disabled) {
          box-shadow: 0 12px 25px rgba(37, 99, 235, 0.35);
          transform: translateY(-1px);
        }
        .sales-login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .sales-login-error {
          margin-bottom: 1rem;
          padding: 0.75rem 0.9rem;
          border-radius: 0.75rem;
          background: #fef2f2;
          color: #b91c1c;
          font-size: 0.9rem;
        }
        @media (max-width: 480px) {
          .sales-login-card {
            padding: 2rem 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}


