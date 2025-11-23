/**
 * Account Settings Page
 * [2025-01-27 13:00:00] 实现账户设置功能：密码修改、通知偏好
 * [2025-01-27] 修复：密码修改API路径已修复为 PUT /auth/me/password
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi, userPreferencesApi, UserPreferences } from '@/lib/api';

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
      // [2025-01-27] API路径已修复，现在应该可以正常工作
      setError(errorMessage);
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

      {/* Notification Preferences Section */}
      <NotificationPreferencesSection />
    </div>
  );
}

/**
 * Notification Preferences Section Component
 * [2025-01-27] 实现用户通知偏好设置功能
 */
function NotificationPreferencesSection() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // [2025-01-27] 加载用户偏好设置
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        const response = await userPreferencesApi.get();
        setPreferences(response.preferences);
      } catch (err: unknown) {
        console.error('Failed to load preferences:', err);
        // 如果加载失败，使用默认值
        setPreferences({
          emailNotifications: {
            orderUpdates: true,
            promotions: true,
            newsletters: true,
            productUpdates: false,
          },
          smsNotifications: {
            orderUpdates: false,
            promotions: false,
          },
          privacy: {
            profileVisible: true,
            showEmail: false,
            showPhone: false,
          },
        });
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // [2025-01-27] 更新偏好设置
  const handleUpdate = async (section: keyof UserPreferences, field: string, value: boolean) => {
    if (!preferences) return;

    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const updatedPreferences = {
        ...preferences,
        [section]: {
          ...preferences[section],
          [field]: value,
        },
      };

      await userPreferencesApi.update({
        [section]: updatedPreferences[section],
      });

      setPreferences(updatedPreferences);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences.';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section style={{ background: '#f9f9f9', padding: '24px', borderRadius: '8px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Notification Preferences</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>Loading preferences...</p>
      </section>
    );
  }

  if (!preferences) {
    return null;
  }

  return (
    <section style={{ background: '#f9f9f9', padding: '24px', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Notification Preferences</h2>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>
        Control how you receive updates about your orders and account.
      </p>

      {error && (
        <div style={{ padding: '12px', background: '#ffe5e5', color: '#ff1f3d', borderRadius: '4px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '12px', background: '#e5f5e5', color: '#1f7d3d', borderRadius: '4px', marginBottom: '16px' }}>
          Preferences updated successfully!
        </div>
      )}

      {/* Email Notifications */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>Email Notifications</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.emailNotifications.orderUpdates}
              onChange={(e) => handleUpdate('emailNotifications', 'orderUpdates', e.target.checked)}
              disabled={saving}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: saving ? 'not-allowed' : 'pointer' }}
            />
            <span>Order updates and shipping notifications</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.emailNotifications.promotions}
              onChange={(e) => handleUpdate('emailNotifications', 'promotions', e.target.checked)}
              disabled={saving}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: saving ? 'not-allowed' : 'pointer' }}
            />
            <span>Promotions and special offers</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.emailNotifications.newsletters}
              onChange={(e) => handleUpdate('emailNotifications', 'newsletters', e.target.checked)}
              disabled={saving}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: saving ? 'not-allowed' : 'pointer' }}
            />
            <span>Newsletters and company updates</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.emailNotifications.productUpdates}
              onChange={(e) => handleUpdate('emailNotifications', 'productUpdates', e.target.checked)}
              disabled={saving}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: saving ? 'not-allowed' : 'pointer' }}
            />
            <span>New product announcements</span>
          </label>
        </div>
      </div>

      {/* SMS Notifications */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>SMS Notifications</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.smsNotifications.orderUpdates}
              onChange={(e) => handleUpdate('smsNotifications', 'orderUpdates', e.target.checked)}
              disabled={saving}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: saving ? 'not-allowed' : 'pointer' }}
            />
            <span>Order updates via SMS</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.smsNotifications.promotions}
              onChange={(e) => handleUpdate('smsNotifications', 'promotions', e.target.checked)}
              disabled={saving}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: saving ? 'not-allowed' : 'pointer' }}
            />
            <span>Promotions via SMS</span>
          </label>
        </div>
      </div>

      {/* Privacy Settings */}
      <div>
        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>Privacy Settings</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.privacy.profileVisible}
              onChange={(e) => handleUpdate('privacy', 'profileVisible', e.target.checked)}
              disabled={saving}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: saving ? 'not-allowed' : 'pointer' }}
            />
            <span>Make my profile visible to other users</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.privacy.showEmail}
              onChange={(e) => handleUpdate('privacy', 'showEmail', e.target.checked)}
              disabled={saving}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: saving ? 'not-allowed' : 'pointer' }}
            />
            <span>Show my email address on my profile</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.privacy.showPhone}
              onChange={(e) => handleUpdate('privacy', 'showPhone', e.target.checked)}
              disabled={saving}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: saving ? 'not-allowed' : 'pointer' }}
            />
            <span>Show my phone number on my profile</span>
          </label>
        </div>
      </div>
    </section>
  );
}

