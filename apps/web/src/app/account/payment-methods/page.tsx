/**
 * Payment Methods Management Page
 * [2025-12-06 17:20:00] Payment method management for Issue #112
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { paymentMethodsApi, PaymentMethod } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { ACCOUNT_ROUTES } from '@/lib/routes/account'; // [2025-01-27 16:00:00] 使用路由映射

export default function PaymentMethodsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await paymentMethodsApi.list();
      setPaymentMethods(response.paymentMethods);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load payment methods';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await paymentMethodsApi.setDefault(id);
      await loadPaymentMethods();
      showSuccess('Default payment method updated');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set default payment method';
      showError(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) {
      return;
    }

    try {
      setDeleting(id);
      await paymentMethodsApi.delete(id);
      await loadPaymentMethods();
      showSuccess('Payment method deleted');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete payment method';
      showError(errorMessage);
    } finally {
      setDeleting(null);
    }
  };

  const formatCardNumber = (last4: string | null | undefined) => {
    if (!last4) return '••••';
    return `•••• ${last4}`;
  };

  const formatExpiry = (month: number | null | undefined, year: number | null | undefined) => {
    if (!month || !year) return '';
    return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;
  };

  const getCardBrandIcon = (brand: string | null | undefined) => {
    if (!brand) return '💳';
    const brandLower = brand.toLowerCase();
    if (brandLower === 'visa') return '💳';
    if (brandLower === 'mastercard') return '💳';
    if (brandLower === 'amex') return '💳';
    return '💳';
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '72px 0', maxWidth: '800px' }}>
        <div style={{ marginBottom: '32px' }}>
          <Link href={ACCOUNT_ROUTES.dashboard} style={{ color: '#666', textDecoration: 'none', marginBottom: '16px', display: 'inline-block' }}>
            ← Back to Account
          </Link>
          <h1>Payment Methods</h1>
        </div>
        <p>Loading payment methods...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '72px 0', maxWidth: '800px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Link href="/account" style={{ color: '#666', textDecoration: 'none', marginBottom: '16px', display: 'inline-block' }}>
          ← Back to Account
        </Link>
        <h1>Payment Methods</h1>
        <p>Manage your saved payment methods for faster checkout.</p>
      </div>

      {error && (
        <div style={{ padding: '12px', background: '#ffe5e5', color: '#ff1f3d', borderRadius: '4px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {paymentMethods.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', background: '#f9f9f9', borderRadius: '8px' }}>
          <p style={{ fontSize: '18px', color: '#666', marginBottom: '16px' }}>No saved payment methods</p>
          <p style={{ color: '#999', marginBottom: '24px' }}>
            You can save payment methods during checkout for faster future purchases.
          </p>
          <Link href="/checkout" className="btn" style={{ display: 'inline-block' }}>
            Go to Checkout
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              style={{
                padding: '20px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                background: method.isDefault ? '#f0f9ff' : '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                <span style={{ fontSize: '32px' }}>{getCardBrandIcon(method.cardBrand)}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '16px' }}>
                      {method.cardBrand ? method.cardBrand.toUpperCase() : 'Card'} {formatCardNumber(method.cardLast4)}
                    </span>
                    {method.isDefault && (
                      <span
                        style={{
                          padding: '2px 8px',
                          background: '#2563eb',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        Default
                      </span>
                    )}
                  </div>
                  {method.cardExpMonth && method.cardExpYear && (
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      Expires {formatExpiry(method.cardExpMonth, method.cardExpYear)}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {!method.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(method.id)}
                    className="btn btn--outline"
                    style={{ fontSize: '14px', padding: '8px 16px' }}
                  >
                    Set as Default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(method.id)}
                  disabled={deleting === method.id}
                  className="btn btn--outline"
                  style={{
                    fontSize: '14px',
                    padding: '8px 16px',
                    color: '#ef4444',
                    borderColor: '#ef4444',
                  }}
                >
                  {deleting === method.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '32px', padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>About Payment Methods</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
          <li>Your payment methods are securely stored and encrypted</li>
          <li>You can set one payment method as default for faster checkout</li>
          <li>You can add new payment methods during checkout</li>
          <li>Deleting a payment method will not affect past orders</li>
        </ul>
      </div>
    </div>
  );
}

