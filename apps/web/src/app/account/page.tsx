/**
 * Account Overview Page
 * [2025-11-12 00:04:40] Added account hub prompting users to log in
 * [2025-01-27 13:15:00] Enhanced with user profile display and navigation links
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi, type UserProfile } from '@/lib/api';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const data = await authApi.me();
        if (cancelled) return;
        setUser(data);
      } catch {
        if (cancelled) return;
        // User not logged in, keep showing login prompt
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (loading) {
    return (
      <section className="container" style={{ padding: '72px 0', maxWidth: '960px' }}>
        <p>Loading...</p>
      </section>
    );
  }

  // Not logged in - show login prompt
  if (!user) {
    return (
      <section className="container" style={{ padding: '72px 0', display: 'grid', gap: '24px', maxWidth: '640px' }}>
        <h1>Your Account</h1>
        <p>
          Sign in to review orders, manage saved designs, and update your profile information. New here? Create
          an account to unlock faster checkout and collaboration tools.
        </p>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Link className="btn" href="/login">
            Sign in
          </Link>
          <Link className="btn btn--outline" href="/register">
            Create account
          </Link>
          <Link className="btn btn--outline" href="/account/orders">
            View order history
          </Link>
        </div>
      </section>
    );
  }

  // Logged in - show account dashboard
  return (
    <section className="container" style={{ padding: '72px 0', maxWidth: '960px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1>Welcome back{user.firstName ? `, ${user.firstName}` : ''}!</h1>
        <p>Manage your account, orders, and preferences.</p>
      </div>

      {/* User Info Card */}
      <div style={{ background: '#f9f9f9', padding: '24px', borderRadius: '8px', marginBottom: '32px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Account Information</h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div>
            <strong>Email:</strong> {user.email}
          </div>
          {user.firstName || user.lastName ? (
            <div>
              <strong>Name:</strong> {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Not set'}
            </div>
          ) : null}
          {user.phone && (
            <div>
              <strong>Phone:</strong> {user.phone}
            </div>
          )}
          {user.createdAt && (
            <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
              Member since {new Date(user.createdAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '16px' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <Link
            href="/account/orders"
            style={{
              padding: '20px',
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '8px',
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Orders</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>View order history and track shipments</p>
          </Link>

          <Link
            href="/account/addresses"
            style={{
              padding: '20px',
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '8px',
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Addresses</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Manage shipping addresses</p>
          </Link>

          <Link
            href="/account/profile"
            style={{
              padding: '20px',
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '8px',
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Profile</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Update your personal information</p>
          </Link>

          <Link
            href="/account/settings"
            style={{
              padding: '20px',
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '8px',
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Settings</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Change password and preferences</p>
          </Link>

          <Link
            href="/account/designs"
            style={{
              padding: '20px',
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '8px',
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Saved Designs</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Manage your Design Lab projects</p>
          </Link>
        </div>
      </div>

      {/* Account Management */}
      <div style={{ borderTop: '1px solid #ddd', paddingTop: '24px' }}>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: '1px solid #ff1f3d',
            color: '#ff1f3d',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Sign Out
        </button>
      </div>
    </section>
  );
}

