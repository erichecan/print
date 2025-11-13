/**
 * Checkout Success Page
 * [2025-11-12 00:45:10] 支付成功提示页
 * [2025-11-12 06:19:54] 添加 'use client' 指令以支持 styled-jsx
 * [2025-01-27 10:35:00] 添加订单号复制功能，优化用户体验
 */
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams?.get('orderNumber') || '';
  const email = searchParams?.get('email') || '';
  const [copied, setCopied] = useState(false);

  const orderLink =
    orderNumber && email
      ? `/orders/${encodeURIComponent(orderNumber)}?email=${encodeURIComponent(email)}`
      : '/orders';

  const handleCopyOrderNumber = async () => {
    if (!orderNumber) return;
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[2025-01-27 10:35:00] Failed to copy order number:', err);
    }
  };

  return (
    <div className="success-page">
      <div className="card">
        <div className="icon">🎉</div>
        <h1>Your order is confirmed!</h1>
        <p>
          Thank you for your purchase. We&apos;ve emailed a receipt to{' '}
          <strong>{email || 'your inbox'}</strong>.
        </p>

        {orderNumber ? (
          <div className="order-number-section">
            <p className="order-number-label">Order number:</p>
            <div className="order-number-container">
              <strong className="order-number-value">{orderNumber}</strong>
              <button
                type="button"
                onClick={handleCopyOrderNumber}
                className="copy-button"
                aria-label="Copy order number"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        ) : (
          <p className="order-number">You can review recent orders from your account dashboard.</p>
        )}

        <div className="actions">
          <Link href={orderLink} className="btn-primary">
            View order details
          </Link>
          <Link href="/products" className="btn-outline">
            Continue shopping
          </Link>
        </div>
      </div>

      <style jsx>{`
        .success-page {
          max-width: 720px;
          margin: 0 auto;
          padding: 3rem 1.5rem;
          display: flex;
          justify-content: center;
        }
        .card {
          background: #ffffff;
          border-radius: 16px;
          padding: 3rem 2rem;
          text-align: center;
          box-shadow: 0 32px 64px rgba(15, 23, 42, 0.1);
          width: 100%;
        }
        .icon {
          font-size: 3rem;
          margin-bottom: 1.5rem;
        }
        h1 {
          font-size: 2rem;
          margin-bottom: 1rem;
        }
        p {
          color: #475569;
          margin-bottom: 0.75rem;
          line-height: 1.6;
        }
        .order-number-section {
          margin-top: 1.5rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .order-number-label {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          color: #64748b;
        }
        .order-number-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .order-number-value {
          font-size: 1.125rem;
          font-family: monospace;
          color: #1f2937;
        }
        .copy-button {
          padding: 0.375rem 0.75rem;
          background: #ffffff;
          border: 1px solid #d4d7de;
          border-radius: 6px;
          font-size: 0.875rem;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .copy-button:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
        }
        .copy-button:active {
          transform: scale(0.98);
        }
        .order-number {
          margin-top: 1rem;
          font-size: 1rem;
        }
        .actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 2rem;
        }
        .btn-primary {
          display: inline-block;
          padding: 0.85rem 1.5rem;
          border-radius: 999px;
          background: #ff1f3d;
          color: #fff;
          font-weight: 600;
          text-decoration: none;
        }
        .btn-outline {
          display: inline-block;
          padding: 0.85rem 1.5rem;
          border-radius: 999px;
          border: 1px solid #d4d7de;
          color: #1f2937;
          text-decoration: none;
          font-weight: 600;
        }
        .btn-outline:hover {
          background: #f8fafc;
        }
        @media (min-width: 640px) {
          .actions {
            flex-direction: row;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}


