/**
 * Mobile Profile View Component
 * 移动端个人资料视图
 */
'use client';

import { UserProfile } from '@/lib/api';

interface MobileProfileViewProps {
    profile: UserProfile | null;
    formData: {
        firstName: string;
        lastName: string;
        phone: string;
    };
    setFormData: (data: any) => void;
    handleSubmit: (e: React.FormEvent) => void;
    saving: boolean;
    error: string | null;
    success: boolean;
}

export function MobileProfileView({
    profile,
    formData,
    setFormData,
    handleSubmit,
    saving,
    error,
    success,
}: MobileProfileViewProps) {
    return (
        <div className="mobile-view">
            <header className="mobile-view__header">
                <h1>Profile</h1>
                <p>Manage your account details</p>
            </header>

            {error && <div className="mobile-view__alert mobile-view__alert--error">{error}</div>}
            {success && <div className="mobile-view__alert mobile-view__alert--success">Profile updated!</div>}

            <form onSubmit={handleSubmit} className="mobile-profile-form">
                <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" value={profile?.email || ''} disabled className="form-input form-input--disabled" />
                    <span className="form-help">Email cannot be changed</span>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>First Name</label>
                        <input
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            className="form-input"
                        />
                    </div>
                    <div className="form-group">
                        <label>Last Name</label>
                        <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            className="form-input"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Phone Number</label>
                    <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1 (555) 000-0000"
                        className="form-input"
                    />
                </div>

                <button type="submit" disabled={saving} className="mobile-view__btn">
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </form>

            {profile?.createdAt && (
                <div className="mobile-profile-meta">
                    <p>Member since {new Date(profile.createdAt).toLocaleDateString()}</p>
                </div>
            )}

            <style jsx>{`
        .mobile-view {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .mobile-view__header h1 {
          font-size: 20px;
          font-weight: 700;
          margin: 0;
        }
        .mobile-view__header p {
          font-size: 14px;
          color: #6b7280;
          margin: 4px 0 0;
        }
        .mobile-view__alert {
          padding: 12px;
          border-radius: 0;
          font-size: 14px;
        }
        .mobile-view__alert--error { background: #fee2e2; color: #b91c1c; }
        .mobile-view__alert--success { background: #d1fae5; color: #065f46; }
        
        .mobile-profile-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: #fff;
          padding: 20px;
          border-radius: 0;
          border: 1px solid var(--color-border, #DBDBDB);
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .form-group label {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }
        .form-input {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 0;
          font-size: 15px;
          width: 100%;
        }
        .form-input--disabled {
          background: #f3f4f6;
          color: #6b7280;
          border-color: #e5e7eb;
        }
        .form-help {
          font-size: 12px;
          color: #9ca3af;
        }
        .mobile-view__btn {
          margin-top: 8px;
          padding: 14px;
          background: #B40C1C;
          color: #fff;
          border: none;
          border-radius: 0;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
        }
        .mobile-view__btn:disabled {
          opacity: 0.6;
        }
        .mobile-profile-meta {
          text-align: center;
          font-size: 12px;
          color: #9ca3af;
        }
      `}</style>
        </div>
    );
}
