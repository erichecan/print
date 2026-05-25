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

const sharedStyles = `
  .container {
    max-width: 440px;
    margin: 4rem auto;
    padding: 0 1rem;
  }
  .auth-card {
    background: white;
    padding: 2.5rem;
    border-radius: 0;
    border: 1px solid var(--color-border, #DBDBDB);
  }
  .auth-card h1 {
    font-family: var(--font-heading, 'Marcellus', serif);
    font-size: 1.75rem;
    font-weight: 400;
    letter-spacing: -0.02em;
    color: var(--color-text, #121212);
    margin: 0 0 1.5rem;
  }
  .form-group {
    margin-bottom: 1.25rem;
  }
  .form-group label {
    display: block;
    margin-bottom: 0.4rem;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text, #121212);
  }
  .form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--color-border, #DBDBDB);
    border-radius: 0;
    font-size: 0.9375rem;
    color: var(--color-text, #121212);
    background: #fff;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .form-group input:focus {
    outline: none;
    border-color: #000;
  }
  .form-group small {
    display: block;
    margin-top: 0.25rem;
    color: var(--color-text-muted, #737373);
    font-size: 12px;
  }
  .btn-primary {
    width: 100%;
    padding: 0.875rem;
    background: #000;
    color: #fff;
    border: 1px solid #000;
    border-radius: 0;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
    text-align: center;
    transition: background 0.2s, color 0.2s;
    margin-top: 4px;
  }
  .btn-primary:hover:not(:disabled) {
    background: #fff;
    color: #000;
  }
  .btn-primary:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .error-message {
    color: var(--color-accent, #B40C1C);
    padding: 0.75rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0;
    margin-bottom: 1rem;
    font-size: 14px;
  }
  .success-message {
    padding: 1.25rem;
    background: var(--color-bg-sand, #F1EEE9);
    border: 1px solid var(--color-border, #DBDBDB);
    border-radius: 0;
    color: var(--color-text, #121212);
  }
  .success-message p {
    margin-bottom: 0.5rem;
    font-size: 14px;
    line-height: 1.6;
  }
  .auth-links {
    margin-top: 1.5rem;
    text-align: center;
  }
  .auth-links a {
    color: var(--color-text, #121212);
    text-decoration: underline;
    font-size: 13px;
  }
  .auth-links a:hover {
    opacity: 0.7;
  }
  .back-link {
    display: block;
    margin-top: 1rem;
    color: var(--color-text, #121212);
    text-decoration: underline;
    font-size: 13px;
    text-align: center;
  }
  .back-link:hover {
    opacity: 0.7;
  }
`;

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

  if (validToken === false) {
    return (
      <div className="container">
        <div className="auth-card">
          <h1>Reset Password</h1>
          <div className="error-message">
            <p>Invalid or missing reset token.</p>
            <p style={{ marginTop: '0.5rem' }}>Please request a new password reset link.</p>
          </div>
          <Link href="/forgot-password" className="btn-primary">
            Request New Reset Link
          </Link>
          <Link href="/login" className="back-link">
            Back to Sign In
          </Link>
        </div>
        <style jsx>{sharedStyles}</style>
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
            <p>Redirecting to login page...</p>
            <Link href="/login" className="btn-primary" style={{ marginTop: '1rem' }}>
              Go to Sign In
            </Link>
          </div>
        ) : (
          <>
            <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-muted, #737373)', fontSize: '14px', lineHeight: '1.6' }}>
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
                <small>Must be at least 8 characters.</small>
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

      <style jsx>{sharedStyles}</style>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="container">
        <div className="auth-card">
          <h1>Reset Password</h1>
          <p style={{ color: 'var(--color-text-muted, #737373)', fontSize: '14px' }}>Loading...</p>
        </div>
        <style jsx>{sharedStyles}</style>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
