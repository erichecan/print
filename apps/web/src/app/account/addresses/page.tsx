/**
 * Address Management Page
 * [2025-01-27 12:30:00] 实现用户地址管理功能：列表、添加、编辑、删除、设置默认地址
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi, addressesApi, type Address, type AddressPayload } from '@/lib/api';

export default function AddressesPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<AddressPayload>({
    firstName: '',
    lastName: '',
    company: '',
    address1: '',
    address2: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'CA',
    phone: '',
    isDefault: false,
  });

  const fetchAddresses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await addressesApi.list();
      setAddresses(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load addresses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await authApi.me();
        if (cancelled) return;
        await fetchAddresses();
      } catch {
        if (cancelled) return;
        router.replace('/login?redirect=/account/addresses');
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [fetchAddresses, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingId) {
        // 更新地址
        await addressesApi.update(editingId, formData);
      } else {
        // 创建新地址
        await addressesApi.create(formData);
      }
      await fetchAddresses();
      setEditingId(null);
      setShowAddForm(false);
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save address.');
    }
  };

  const handleEdit = (address: Address) => {
    setFormData({
      firstName: address.firstName || '',
      lastName: address.lastName || '',
      company: address.company || '',
      address1: address.address1,
      address2: address.address2 || '',
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone || '',
      isDefault: address.isDefault,
    });
    setEditingId(address.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      await addressesApi.delete(id);
      await fetchAddresses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete address.');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await addressesApi.setDefault(id);
      await fetchAddresses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to set default address.');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      company: '',
      address1: '',
      address2: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'CA',
      phone: '',
      isDefault: false,
    });
    setEditingId(null);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    resetForm();
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '72px 0' }}>
        <p>Loading addresses...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '72px 0', maxWidth: '960px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Link href="/account" style={{ color: '#666', textDecoration: 'none', marginBottom: '16px', display: 'inline-block' }}>
          ← Back to Account
        </Link>
        <h1>Addresses</h1>
        <p>Manage your shipping addresses for faster checkout.</p>
      </div>

      {error && (
        <div style={{ padding: '12px', background: '#ffe5e5', color: '#ff1f3d', borderRadius: '4px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {!showAddForm && (
        <div style={{ marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="btn"
            style={{ background: '#ff1f3d', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Add New Address
          </button>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleSubmit} style={{ background: '#f9f9f9', padding: '24px', borderRadius: '8px', marginBottom: '32px' }}>
          <h2 style={{ marginTop: 0 }}>{editingId ? 'Edit Address' : 'Add New Address'}</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label htmlFor="firstName" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                First Name *
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label htmlFor="lastName" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                Last Name *
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="company" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              Company (Optional)
            </label>
            <input
              id="company"
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="address1" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              Address Line 1 *
            </label>
            <input
              id="address1"
              type="text"
              required
              value={formData.address1}
              onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="address2" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              Address Line 2 (Optional)
            </label>
            <input
              id="address2"
              type="text"
              value={formData.address2}
              onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label htmlFor="city" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                City *
              </label>
              <input
                id="city"
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label htmlFor="province" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                Province/State *
              </label>
              <input
                id="province"
                type="text"
                required
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label htmlFor="postalCode" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                Postal Code *
              </label>
              <input
                id="postalCode"
                type="text"
                required
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label htmlFor="country" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                Country *
              </label>
              <select
                id="country"
                required
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="CA">Canada</option>
                <option value="US">United States</option>
              </select>
            </div>
            <div>
              <label htmlFor="phone" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                Phone (Optional)
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              />
              <span>Set as default address</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              className="btn"
              style={{ background: '#ff1f3d', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '4px', cursor: 'pointer' }}
            >
              {editingId ? 'Update Address' : 'Add Address'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn--outline"
              style={{ padding: '12px 24px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #ddd', background: 'white' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {addresses.length === 0 && !showAddForm ? (
        <div style={{ textAlign: 'center', padding: '48px', background: '#f9f9f9', borderRadius: '8px' }}>
          <p style={{ marginBottom: '16px' }}>You haven't saved any addresses yet.</p>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="btn"
            style={{ background: '#ff1f3d', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Add Your First Address
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {addresses.map((address) => (
            <div
              key={address.id}
              style={{
                padding: '20px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                background: address.isDefault ? '#f0f8ff' : 'white',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div>
                  {address.isDefault && (
                    <span style={{ display: 'inline-block', padding: '4px 8px', background: '#ff1f3d', color: 'white', borderRadius: '4px', fontSize: '12px', marginBottom: '8px' }}>
                      Default
                    </span>
                  )}
                  <h3 style={{ margin: '0 0 8px 0' }}>
                    {address.firstName} {address.lastName}
                  </h3>
                  {address.company && <p style={{ margin: '0 0 8px 0', color: '#666' }}>{address.company}</p>}
                  <address style={{ fontStyle: 'normal', lineHeight: '1.6' }}>
                    <p style={{ margin: '0' }}>{address.address1}</p>
                    {address.address2 && <p style={{ margin: '0' }}>{address.address2}</p>}
                    <p style={{ margin: '0' }}>
                      {address.city}, {address.province} {address.postalCode}
                    </p>
                    <p style={{ margin: '0' }}>{address.country}</p>
                    {address.phone && <p style={{ margin: '8px 0 0 0' }}>Phone: {address.phone}</p>}
                  </address>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                  {!address.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(address.id)}
                      className="btn btn--outline"
                      style={{ padding: '6px 12px', fontSize: '14px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', borderRadius: '4px' }}
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleEdit(address)}
                    className="btn btn--outline"
                    style={{ padding: '6px 12px', fontSize: '14px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(address.id)}
                    className="btn btn--outline"
                    style={{ padding: '6px 12px', fontSize: '14px', border: '1px solid #ff1f3d', color: '#ff1f3d', background: 'white', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

