/**
 * Mobile Settings View Component
 * 移动端账户设置视图
 */
'use client';

import { UserPreferences } from '@/lib/api';
import {
    getPasswordStrengthDescription,
    getPasswordStrengthColor,
    PasswordValidationResult,
} from '@/utils/passwordValidator';

interface MobileSettingsViewProps {
    passwordForm: any;
    setPasswordForm: (val: any) => void;
    passwordValidation: PasswordValidationResult | null;
    handlePasswordChange: (e: React.FormEvent) => void;
    saving: boolean;
    error: string | null;
    success: boolean;
    preferences: UserPreferences | null;
    prefLoading: boolean;
    prefSaving: boolean;
    prefError: string | null;
    prefSuccess: boolean;
    handlePrefUpdate: (section: keyof UserPreferences, field: string, value: boolean) => void;
}

export function MobileSettingsView({
    passwordForm,
    setPasswordForm,
    passwordValidation,
    handlePasswordChange,
    saving,
    error,
    success,
    preferences,
    prefLoading,
    prefSaving,
    prefError,
    prefSuccess,
    handlePrefUpdate,
}: MobileSettingsViewProps) {
    return (
        <div className="mobile-view">
            <header className="mobile-view__header">
                <h1>Settings</h1>
                <p>Manage security and notifications</p>
            </header>

            {/* Password Change */}
            <section className="mobile-settings-section">
                <h2>Change Password</h2>
                {error && <div className="mobile-view__alert mobile-view__alert--error">{error}</div>}
                {success && <div className="mobile-view__alert mobile-view__alert--success">Password updated!</div>}

                <form onSubmit={handlePasswordChange} className="mobile-settings-form">
                    <div className="form-group">
                        <label>Current Password*</label>
                        <input
                            type="password"
                            required
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                            className="form-input"
                        />
                    </div>
                    <div className="form-group">
                        <label>New Password*</label>
                        <input
                            type="password"
                            required
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            className="form-input"
                        />
                        {passwordValidation && (
                            <div className="password-strength">
                                <div className="strength-row">
                                    <span>Strength:</span>
                                    <span style={{ color: getPasswordStrengthColor(passwordValidation.strength) }}>
                                        {getPasswordStrengthDescription(passwordValidation.strength)}
                                    </span>
                                </div>
                                <div className="strength-bar">
                                    <div
                                        className="strength-bar-fill"
                                        style={{
                                            width: passwordValidation.strength === 'weak' ? '33%' : passwordValidation.strength === 'medium' ? '66%' : '100%',
                                            backgroundColor: getPasswordStrengthColor(passwordValidation.strength),
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="form-group">
                        <label>Confirm New Password*</label>
                        <input
                            type="password"
                            required
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            className="form-input"
                        />
                    </div>
                    <button type="submit" disabled={saving} className="mobile-view__btn">
                        {saving ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </section>

            {/* Notifications */}
            <section className="mobile-settings-section">
                <h2>Notifications</h2>
                {prefError && <div className="mobile-view__alert mobile-view__alert--error">{prefError}</div>}
                {prefSuccess && <div className="mobile-view__alert mobile-view__alert--success">Preferences saved!</div>}

                {prefLoading ? (
                    <p className="loading-text">Loading preferences...</p>
                ) : preferences ? (
                    <div className="preferences-list">
                        <h3>Email</h3>
                        <div className="preferences-group">
                            <label className="checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={preferences.emailNotifications.orderUpdates}
                                    onChange={(e) => handlePrefUpdate('emailNotifications', 'orderUpdates', e.target.checked)}
                                    disabled={prefSaving}
                                />
                                <span>Order Updates</span>
                            </label>
                            <label className="checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={preferences.emailNotifications.promotions}
                                    onChange={(e) => handlePrefUpdate('emailNotifications', 'promotions', e.target.checked)}
                                    disabled={prefSaving}
                                />
                                <span>Promotions</span>
                            </label>
                        </div>

                        <h3 style={{ marginTop: '16px' }}>Privacy</h3>
                        <div className="preferences-group">
                            <label className="checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={preferences.privacy.profileVisible}
                                    onChange={(e) => handlePrefUpdate('privacy', 'profileVisible', e.target.checked)}
                                    disabled={prefSaving}
                                />
                                <span>Public Profile</span>
                            </label>
                        </div>
                    </div>
                ) : null}
            </section>

            <style jsx>{`
        .mobile-view { display: flex; flex-direction: column; gap: 20px; }
        .mobile-view__header h1 { font-size: 20px; font-weight: 700; margin: 0; }
        .mobile-view__header p { font-size: 14px; color: #6b7280; margin: 4px 0 0; }
        
        .mobile-settings-section { background: #fff; padding: 20px; border-radius: 0; border: 1px solid var(--color-border, #DBDBDB); }
        .mobile-settings-section h2 { font-size: 16px; font-weight: 700; margin: 0 0 16px; }
        
        .mobile-view__alert { padding: 10px; border-radius: 0; font-size: 13px; margin-bottom: 12px; }
        .mobile-view__alert--error { background: #fee2e2; color: #b91c1c; }
        .mobile-view__alert--success { background: #d1fae5; color: #065f46; }
        
        .mobile-settings-form { display: flex; flex-direction: column; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-group label { font-size: 12px; font-weight: 600; color: #4b5563; }
        .form-input { padding: 10px; border: 1px solid #d1d5db; border-radius: 0; font-size: 14px; }
        
        .password-strength { margin-top: 4px; }
        .strength-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; }
        .strength-bar { height: 4px; background: #f3f4f6; border-radius: 2px; overflow: hidden; }
        .strength-bar-fill { height: 100%; transition: width 0.3s; }
        
        .mobile-view__btn { margin-top: 8px; padding: 12px; background: #B40C1C; color: #fff; border: none; border-radius: 0; font-weight: 600; cursor: pointer; }
        
        .preferences-list h3 { font-size: 13px; font-weight: 600; color: #9ca3af; text-transform: uppercase; margin: 0 0 8px; }
        .preferences-group { display: flex; flex-direction: column; gap: 12px; }
        .checkbox-item { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
        .checkbox-item input { width: 18px; height: 18px; cursor: pointer; }
        
        .loading-text { font-size: 14px; color: #6b7280; }
      `}</style>
        </div>
    );
}
