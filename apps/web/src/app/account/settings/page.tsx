/**
 * Account Settings Page
* 实现账户设置功能：密码修改、通知偏好
* 修复：密码修改API路径已修复为 PUT /auth/me/password
* Enhanced with password strength validation
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi, userPreferencesApi, UserPreferences } from '@/lib/api';
import { ACCOUNT_ROUTES } from '@/lib/routes/account';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileSettingsView } from '../components/mobile/MobileSettingsView';
import {
  validatePasswordStrength,
  getPasswordStrengthDescription,
  getPasswordStrengthColor,
  type PasswordValidationResult,
} from '@/utils/passwordValidator';

export default function SettingsPage() {
  const router = useRouter();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidationResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Real-time password validation
  useEffect(() => {
    if (passwordForm.newPassword) {
      const validation = validatePasswordStrength(passwordForm.newPassword);
      setPasswordValidation(validation);
    } else {
      setPasswordValidation(null);
    }
  }, [passwordForm.newPassword]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate current password
    // Validate current password
    if (!passwordForm.currentPassword) {
      setError('Please enter your current password');
      return;
    }

    // Validate new password strength
    if (!passwordForm.newPassword) {
      setError('Please enter a new password');
      return;
    }

    const validation = validatePasswordStrength(passwordForm.newPassword);
    if (!validation.valid) {
      setError(validation.errors[0] || 'New password does not meet strength requirements');
      return;
    }

    // Validate password confirmation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New password and confirmation password do not match');
      return;
    }

    // Check if new password is different from current password
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setError('New password must be different from current password');
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
      setPasswordValidation(null);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: unknown) {
      let errorMessage = 'Failed to change password, please try again later';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        errorMessage = String(err.message);
      }
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const isMobile = useIsMobile();

  return (
    <NotificationPreferencesProvider>
      {(prefProps) => (
        isMobile ? (
          <MobileSettingsView
            passwordForm={passwordForm}
            setPasswordForm={setPasswordForm}
            passwordValidation={passwordValidation}
            handlePasswordChange={handlePasswordChange}
            saving={saving}
            error={error}
            success={success}
            {...prefProps}
          />
        ) : (
          <div className="container" style={{ padding: '72px 0', maxWidth: '640px' }}>
            <div style={{ marginBottom: '32px' }}>
              <Link href={ACCOUNT_ROUTES.orders} style={{ color: '#666', textDecoration: 'none', marginBottom: '16px', display: 'inline-block' }}>
                ← Back to Orders
              </Link>
              <h1>Account Settings</h1>
              <p>Manage your account security and preferences.</p>
            </div>

            {/* Password Change Section */}
            <section style={{ background: 'var(--color-bg-sand, #F1EEE9)', padding: '24px', borderRadius: '0', marginBottom: '32px' }}>
              <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Change Password</h2>

              {error && (
                <div style={{ padding: '12px', background: '#fef2f2', color: '#B40C1C', borderRadius: '0', marginBottom: '16px' }}>
                  {error}
                </div>
              )}

              {success && (
                <div style={{ padding: '12px', background: 'var(--color-bg-sand, #F1EEE9)', color: 'var(--color-text, #121212)', borderRadius: '0', marginBottom: '16px' }}>
                  ✅ Password changed successfully!
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
                    style={{ width: '100%', padding: '8px', border: '1px solid var(--color-border, #DBDBDB)', borderRadius: '0' }}
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
                    maxLength={128}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: passwordValidation && !passwordValidation.valid ? '1px solid #B40C1C' : '1px solid var(--color-border, #DBDBDB)',
                      borderRadius: '0',
                    }}
                  />
                  {passwordValidation && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', color: '#666' }}>Password Strength:</span>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: getPasswordStrengthColor(passwordValidation.strength),
                          }}
                        >
                          {getPasswordStrengthDescription(passwordValidation.strength)}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: '4px',
                            background: '#e0e0e0',
                            borderRadius: '2px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: passwordValidation.strength === 'weak' ? '33%' : passwordValidation.strength === 'medium' ? '66%' : '100%',
                              height: '100%',
                              background: getPasswordStrengthColor(passwordValidation.strength),
                              transition: 'all 0.3s ease',
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        <div style={{ marginBottom: '4px' }}>Password Requirements:</div>
                        <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                          <li style={{ color: passwordValidation.requirements.length ? 'var(--color-text, #121212)' : '#666' }}>
                            {passwordValidation.requirements.length ? '✓' : '○'} At least 8 characters, max 128
                          </li>
                          <li style={{ color: passwordValidation.requirements.uppercase ? 'var(--color-text, #121212)' : '#666' }}>
                            {passwordValidation.requirements.uppercase ? '✓' : '○'} At least one uppercase letter
                          </li>
                          <li style={{ color: passwordValidation.requirements.lowercase ? 'var(--color-text, #121212)' : '#666' }}>
                            {passwordValidation.requirements.lowercase ? '✓' : '○'} At least one lowercase letter
                          </li>
                          <li style={{ color: passwordValidation.requirements.number ? 'var(--color-text, #121212)' : '#666' }}>
                            {passwordValidation.requirements.number ? '✓' : '○'} At least one number
                          </li>
                          <li style={{ color: passwordValidation.requirements.special ? 'var(--color-text, #121212)' : '#666' }}>
                            {passwordValidation.requirements.special ? '✓' : '○'} At least one special character
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
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
                    maxLength={128}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border:
                        passwordForm.confirmPassword &&
                          passwordForm.newPassword &&
                          passwordForm.confirmPassword !== passwordForm.newPassword
                          ? '1px solid #B40C1C'
                          : '1px solid var(--color-border, #DBDBDB)',
                      borderRadius: '0',
                    }}
                  />
                  {passwordForm.confirmPassword &&
                    passwordForm.newPassword &&
                    passwordForm.confirmPassword !== passwordForm.newPassword && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#B40C1C' }}>
                        Passwords do not match
                      </p>
                    )}
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn"
                  style={{
                    background: '#B40C1C',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '0',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>

              <div style={{ marginTop: '16px', padding: '12px', background: '#fff3cd', borderRadius: '0', fontSize: '14px' }}>
                <p style={{ margin: 0 }}>
                  <strong>Forgot your password?</strong>{' '}
                  <Link href="/forgot-password" style={{ color: '#B40C1C', textDecoration: 'none' }}>
                    Reset it here
                  </Link>
                </p>
              </div>
            </section>

            {/* Notification Preferences Section */}
            <NotificationPreferencesSection {...prefProps} />
          </div>
        )
      )}
    </NotificationPreferencesProvider>
  );
}

/**
 * Notification Preferences Section Component (Desktop)
 */
function NotificationPreferencesSection({
  preferences,
  prefLoading,
  prefSaving,
  prefError,
  prefSuccess,
  handlePrefUpdate,
}: any) {
  if (prefLoading) {
    return (
      <section style={{ background: 'var(--color-bg-sand, #F1EEE9)', padding: '24px', borderRadius: '0' }}>
        <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Notification Preferences</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>Loading preferences...</p>
      </section>
    );
  }

  if (!preferences) {
    return null;
  }

  return (
    <section style={{ background: 'var(--color-bg-sand, #F1EEE9)', padding: '24px', borderRadius: '0' }}>
      <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Notification Preferences</h2>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>
        Control how you receive updates about your orders and account.
      </p>

      {prefError && (
        <div style={{ padding: '12px', background: '#fef2f2', color: '#B40C1C', borderRadius: '0', marginBottom: '16px' }}>
          {prefError}
        </div>
      )}

      {prefSuccess && (
        <div style={{ padding: '12px', background: 'var(--color-bg-sand, #F1EEE9)', color: 'var(--color-text, #121212)', borderRadius: '0', marginBottom: '16px' }}>
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
              onChange={(e) => handlePrefUpdate('emailNotifications', 'orderUpdates', e.target.checked)}
              disabled={prefSaving}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: prefSaving ? 'not-allowed' : 'pointer' }}
            />
            <span>Order updates and shipping notifications</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.emailNotifications.promotions}
              onChange={(e) => handlePrefUpdate('emailNotifications', 'promotions', e.target.checked)}
              disabled={prefSaving}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: prefSaving ? 'not-allowed' : 'pointer' }}
            />
            <span>Promotions and special offers</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.emailNotifications.newsletters}
              onChange={(e) => handlePrefUpdate('emailNotifications', 'newsletters', e.target.checked)}
              disabled={prefSaving}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: prefSaving ? 'not-allowed' : 'pointer' }}
            />
            <span>Newsletters and company updates</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.emailNotifications.productUpdates}
              onChange={(e) => handlePrefUpdate('emailNotifications', 'productUpdates', e.target.checked)}
              disabled={prefSaving}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: prefSaving ? 'not-allowed' : 'pointer' }}
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
              onChange={(e) => handlePrefUpdate('smsNotifications', 'orderUpdates', e.target.checked)}
              disabled={prefSaving}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: prefSaving ? 'not-allowed' : 'pointer' }}
            />
            <span>Order updates via SMS</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.smsNotifications.promotions}
              onChange={(e) => handlePrefUpdate('smsNotifications', 'promotions', e.target.checked)}
              disabled={prefSaving}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: prefSaving ? 'not-allowed' : 'pointer' }}
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
              onChange={(e) => handlePrefUpdate('privacy', 'profileVisible', e.target.checked)}
              disabled={prefSaving}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: prefSaving ? 'not-allowed' : 'pointer' }}
            />
            <span>Make my profile visible to other users</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.privacy.showEmail}
              onChange={(e) => handlePrefUpdate('privacy', 'showEmail', e.target.checked)}
              disabled={prefSaving}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: prefSaving ? 'not-allowed' : 'pointer' }}
            />
            <span>Show my email address on my profile</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.privacy.showPhone}
              onChange={(e) => handlePrefUpdate('privacy', 'showPhone', e.target.checked)}
              disabled={prefSaving}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: prefSaving ? 'not-allowed' : 'pointer' }}
            />
            <span>Show my phone number on my profile</span>
          </label>
        </div>
      </div>
    </section>
  );
}

/**
 * Notification Preferences Provider Component
 */
function NotificationPreferencesProvider({ children }: { children: (props: any) => React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        const response = await userPreferencesApi.get();
        setPreferences(response.preferences);
      } catch (err: unknown) {
        console.error('Failed to load preferences:', err);
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

  return <>{children({
    preferences,
    prefLoading: loading,
    prefSaving: saving,
    prefError: error,
    prefSuccess: success,
    handlePrefUpdate: handleUpdate
  })}</>;
}

