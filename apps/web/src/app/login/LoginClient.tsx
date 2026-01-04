/**
 * Login Client Component
* 客户端组件，处理登录逻辑和 redirect 参数
 */
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh: refreshAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 获取 redirect 参数
  const redirect = searchParams?.get('redirect') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(email, password);

      console.log('[LoginClient] Login successful, redirect param:', redirect);

      // 根据用户角色和 redirect 参数决定跳转位置
      let targetPath = redirect;

      // 如果是管理员
      if (response.user?.role === 'ADMIN' || response.user?.role === 'admin') {
        if (redirect === '/admin' || redirect.startsWith('/admin/')) {
          // Admin路径：跳转到admin
          targetPath = '/admin';
        } else if (redirect === '/' || !redirect) {
          // 没有指定redirect：跳转到账户页面
          targetPath = '/account';
        } else {
          // 有明确的redirect（如/design-lab）：允许管理员访问
          targetPath = redirect;
        }
      } else {
        // 普通用户登录
        // 如果 redirect 是 /admin 相关路径，跳转到账户页面（不允许普通用户访问后台）
        if (redirect.startsWith('/admin')) {
          targetPath = '/account';
        } else if (redirect === '/' || !redirect) {
          // 如果没有指定redirect或是首页，跳转到账户页面
          targetPath = '/account';
        } else {
          // 否则跳转到指定的redirect地址（如 /design-lab）
          targetPath = redirect;
        }
      }

      console.log('[LoginClient] Final targetPath:', targetPath);

      // Refresh auth context to update client-side user state
      await refreshAuth();

      router.push(targetPath);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="auth-card">
        <h1>Sign In</h1>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="auth-links">
          <Link href="/register">Create an account</Link>
          <Link href="/forgot-password">Forgot password?</Link>
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

