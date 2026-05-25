/**
 * Register Page
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await authApi.register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
      });
      router.push('/login');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="auth-card">
        <h1>Create Account</h1>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              id="password"
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <small>At least 8 characters</small>
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <div className="auth-links">
          <Link href="/login">Already have an account? Sign in</Link>
        </div>
      </div>

      <style jsx>{`
        .container {
          max-width: 500px;
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
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
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
        @media (max-width: 600px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
