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
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
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
          margin-bottom: 1rem;
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

