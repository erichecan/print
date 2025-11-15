/**
 * Login Client Component
 * [2025-11-15 12:05:00] 客户端组件，处理登录逻辑和 redirect 参数
 */
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import Link from 'next/link';

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // [2025-11-15 12:05:00] 获取 redirect 参数
  const redirect = searchParams?.get('redirect') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(email, password);
      
      // [2025-11-15 12:05:00] 根据用户角色和 redirect 参数决定跳转位置
      let targetPath = redirect;
      
      // 如果是管理员，且 redirect 是 /admin 或 /，则跳转到 /admin
      if (response.user?.role === 'ADMIN') {
        if (redirect === '/' || redirect === '/admin') {
          targetPath = '/admin';
        }
      } else {
        // 普通用户，如果 redirect 是 /admin，则跳转到首页
        if (redirect === '/admin') {
          targetPath = '/';
        }
      }
      
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

