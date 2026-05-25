/**
 * Forgot Password Page
* 创建忘记密码页面
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="auth-card">
        <h1>Forgot Password</h1>
        {success ? (
          <div className="success-message">
            <p>If an account with that email exists, we&apos;ve sent you a password reset link.</p>
            <Link href="/login" className="btn-primary">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <p>
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
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
                  placeholder="your@email.com"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Sending...' : 'Send Reset Link'}
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
        .auth-card > p {
          margin-bottom: 1.5rem;
          color: var(--color-text-muted, #737373);
          font-size: 14px;
          line-height: 1.6;
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
          margin-bottom: 1.25rem;
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
      `}</style>
    </div>
  );
}

