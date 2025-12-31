/**
 * Reset Password Page
* 创建重置密码页面，用户通过邮件链接访问此页面
* 使用 Suspense 包装 useSearchParams 以避免预渲染错误
 */
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') || '';
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState<boolean | null>(null);

// 检查token是否存在
  useEffect(() => {
    if (!token) {
      setValidToken(false);
      setError('Invalid or missing reset token. Please request a new password reset.');
    } else {
      setValidToken(true);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // 验证密码
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!token) {
      setError('Invalid reset token. Please request a new password reset.');
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      // 3秒后跳转到登录页面
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password.';
      if (errorMessage.includes('invalid') || errorMessage.includes('expired')) {
        setError('This reset link is invalid or has expired. Please request a new password reset.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

// Token无效时显示错误信息
  if (validToken === false) {
    return (
      <div className="container">
        <div className="auth-card">
          <h1>Reset Password</h1>
          <div className="error-message">
            <p>Invalid or missing reset token.</p>
            <p style={{ marginTop: '1rem' }}>Please request a new password reset link.</p>
          </div>
          <div className="auth-links">
            <Link href="/forgot-password" className="btn-primary">
              Request New Reset Link
            </Link>
            <Link href="/login" style={{ marginTop: '1rem', display: 'block', color: '#ff1f3d', textDecoration: 'none' }}>
              Back to Sign In
            </Link>
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
          .error-message {
            color: #ff1f3d;
            padding: 1rem;
            background: #ffe5e5;
            border-radius: 4px;
            margin-bottom: 1.5rem;
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
            text-decoration: none;
            display: inline-block;
            text-align: center;
          }
          .auth-links {
            text-align: center;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="auth-card">
        <h1>Reset Password</h1>
        
        {success ? (
          <div className="success-message">
            <p>Your password has been reset successfully!</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Redirecting to login page...</p>
            <Link href="/login" className="btn-primary" style={{ marginTop: '1rem' }}>
              Go to Sign In
            </Link>
          </div>
        ) : (
          <>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              Enter your new password below.
            </p>
            <form onSubmit={handleSubmit}>
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-group">
                <label htmlFor="password">New Password *</label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                  Password must be at least 8 characters long.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password *</label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              <button type="submit" disabled={loading || !validToken} className="btn-primary">
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
            <div className="auth-links">
              <Link href="/login">Back to Sign In</Link>
            </div>
          </>
        )}
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
          box-sizing: border-box;
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
          text-decoration: none;
          display: inline-block;
          text-align: center;
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
        .success-message {
          padding: 1rem;
          background: #e8f5e9;
          border-radius: 4px;
          color: #2e7d32;
        }
        .success-message p {
          margin-bottom: 0.5rem;
        }
        .auth-links {
          margin-top: 1.5rem;
          text-align: center;
        }
        .auth-links a {
          color: #ff1f3d;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="container">
        <div className="auth-card">
          <h1>Reset Password</h1>
          <p>Loading...</p>
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
        `}</style>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

