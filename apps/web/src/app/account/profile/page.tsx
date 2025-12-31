/**
 * Profile Edit Page
* 实现用户个人资料编辑功能：显示和更新用户基本信息
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi, type UserProfile } from '@/lib/api';
import { ACCOUNT_ROUTES } from '@/lib/routes/account'; // 使用路由映射

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);
        const data = await authApi.me();
        if (cancelled) return;
        setProfile(data);
        setFormData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
        });
      } catch {
        if (cancelled) return;
        router.replace('/login?redirect=/account/profile');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      await authApi.updateProfile({
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        phone: formData.phone || undefined,
      });
      setSuccess(true);
      // 重新加载用户信息
      const updatedProfile = await authApi.me();
      setProfile(updatedProfile);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '72px 0' }}>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '72px 0', maxWidth: '640px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Link href={ACCOUNT_ROUTES.dashboard} style={{ color: '#666', textDecoration: 'none', marginBottom: '16px', display: 'inline-block' }}>
          ← Back to Account
        </Link>
        <h1>Profile</h1>
        <p>Update your personal information.</p>
      </div>

      {error && (
        <div style={{ padding: '12px', background: '#ffe5e5', color: '#ff1f3d', borderRadius: '4px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '12px', background: '#e5f5e5', color: '#1f7d3d', borderRadius: '4px', marginBottom: '24px' }}>
          Profile updated successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: '#f9f9f9', padding: '24px', borderRadius: '8px' }}>
        <div style={{ marginBottom: '24px' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={profile?.email || ''}
            disabled
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: '#f5f5f5',
              color: '#666',
            }}
          />
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
            Email cannot be changed. Contact support if you need to update your email.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label htmlFor="firstName" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label htmlFor="lastName" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label htmlFor="phone" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        {profile?.createdAt && (
          <div style={{ marginBottom: '24px', padding: '16px', background: 'white', borderRadius: '4px', fontSize: '14px', color: '#666' }}>
            <p style={{ margin: '0 0 4px 0' }}>
              <strong>Member since:</strong> {new Date(profile.createdAt).toLocaleDateString()}
            </p>
            {profile.updatedAt && (
              <p style={{ margin: '0' }}>
                <strong>Last updated:</strong> {new Date(profile.updatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
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
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href={ACCOUNT_ROUTES.dashboard}
            className="btn btn--outline"
            style={{
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: 'pointer',
              border: '1px solid #ddd',
              background: 'white',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

