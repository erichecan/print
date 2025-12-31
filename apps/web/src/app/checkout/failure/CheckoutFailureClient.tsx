'use client';

/**
 * Checkout Failure Client Component
* 提取客户端逻辑以便 Suspense 包裹
 */
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';

export function CheckoutFailureClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { cart } = useCart();
  const reason = searchParams?.get('reason') || '';

  const handleRetryCheckout = () => {
// 如果购物车还有商品，返回结账页面；否则返回购物车
    if (cart && cart.items.length > 0) {
      router.push('/checkout');
    } else {
      router.push('/cart');
    }
  };

  const getErrorSuggestions = () => {
    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes('card') || lowerReason.includes('declined')) {
      return 'Please verify your card number, expiration date, and CVV code.';
    }
    if (lowerReason.includes('insufficient') || lowerReason.includes('funds')) {
      return 'Your card may not have sufficient funds. Please try a different payment method.';
    }
    if (lowerReason.includes('network') || lowerReason.includes('timeout')) {
      return 'There was a network issue. Please check your internet connection and try again.';
    }
    if (lowerReason.includes('expired')) {
      return 'Your card may have expired. Please check the expiration date.';
    }
    return 'Please double-check your payment information or try a different payment method.';
  };

  return (
    <div className="failure-page">
      <div className="card">
        <div className="icon">⚠️</div>
        <h1>Payment could not be completed</h1>
        <p>
          We weren&apos;t able to finish your checkout. The most common causes are incorrect card details or bank
          verification issues.
        </p>
        {reason && (
          <div className="reason-section">
            <p className="reason-label">Error details:</p>
            <p className="reason">{reason}</p>
            <p className="suggestion">{getErrorSuggestions()}</p>
          </div>
        )}
        <div className="help-section">
          <p>
            <strong>Need help?</strong> You can reach out to our support team for assistance at{' '}
            <a href="mailto:support@print.dev" className="support-link">
              support@print.dev
            </a>
            .
          </p>
        </div>
        <div className="actions">
          <button onClick={handleRetryCheckout} className="btn-primary">
            Try checkout again
          </button>
          <Link href="/cart" className="btn-outline">
            Review cart
          </Link>
          <Link href="/products" className="btn-outline">
            Continue shopping
          </Link>
        </div>
      </div>

      <style jsx>{`
        .failure-page {
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
        .reason-section {
          margin: 1.5rem 0;
          padding: 1rem;
          background: #fef2f2;
          border-radius: 8px;
          border: 1px solid #fecaca;
        }
        .reason-label {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #991b1b;
        }
        .reason {
          margin: 0 0 0.75rem 0;
          color: #b91c1c;
          font-family: monospace;
          font-size: 0.875rem;
        }
        .suggestion {
          margin: 0;
          padding-top: 0.75rem;
          border-top: 1px solid #fecaca;
          color: #991b1b;
          font-size: 0.875rem;
        }
        .help-section {
          margin: 1.5rem 0;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .help-section p {
          margin: 0;
          font-size: 0.875rem;
        }
        .support-link {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
        }
        .support-link:hover {
          text-decoration: underline;
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

export default CheckoutFailureClient;

