/**
 * Account Settings Page
 * [2025-01-27 13:00:00] 实现账户设置功能：密码修改、通知偏好（通知偏好功能待后端实现）
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // 验证新密码
    if (passwordForm.newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setError('New password must be different from current password.');
      return;
    }

    setSaving(true);

    try {
      await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setSuccess(true);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change password.';
      // 如果后端API未实现，显示友好提示
      if (errorMessage.includes('404') || errorMessage.includes('501') || errorMessage.includes('not implemented')) {
        setError('Password change is not yet available. Please use the "Forgot Password" feature to reset your password.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container" style={{ padding: '72px 0', maxWidth: '640px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Link href="/account" style={{ color: '#666', textDecoration: 'none', marginBottom: '16px', display: 'inline-block' }}>
          ← Back to Account
        </Link>
        <h1>Account Settings</h1>
        <p>Manage your account security and preferences.</p>
      </div>

      {/* Password Change Section */}
      <section style={{ background: '#f9f9f9', padding: '24px', borderRadius: '8px', marginBottom: '32px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Change Password</h2>

        {error && (
          <div style={{ padding: '12px', background: '#ffe5e5', color: '#ff1f3d', borderRadius: '4px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ padding: '12px', background: '#e5f5e5', color: '#1f7d3d', borderRadius: '4px', marginBottom: '16px' }}>
            Password changed successfully!
          </div>
        )}

        <form onSubmit={handlePasswordChange}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="currentPassword" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              Current Password *
            </label>
            <input
              id="currentPassword"
              type="password"
              required
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="newPassword" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              New Password *
            </label>
            <input
              id="newPassword"
              type="password"
              required
              minLength={8}
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
              Password must be at least 8 characters long.
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              Confirm New Password *
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn"
            style={{
              background: '#ff1f3d',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>

        <div style={{ marginTop: '16px', padding: '12px', background: '#fff3cd', borderRadius: '4px', fontSize: '14px' }}>
          <p style={{ margin: 0 }}>
            <strong>Forgot your password?</strong>{' '}
            <Link href="/forgot-password" style={{ color: '#ff1f3d', textDecoration: 'none' }}>
              Reset it here
            </Link>
          </p>
        </div>
      </section>

      {/* Notification Preferences Section - Placeholder for future implementation */}
      <section style={{ background: '#f9f9f9', padding: '24px', borderRadius: '8px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Notification Preferences</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Notification preferences will be available soon. This feature allows you to control how you receive updates about your orders and account.
        </p>
      </section>
    </div>
  );
}

