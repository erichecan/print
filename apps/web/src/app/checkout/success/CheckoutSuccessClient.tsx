'use client';

/**
 * Checkout Success Client Component
* 从页面拆分为客户端组件并保留业务逻辑
* Enhanced: Handle return_url from Stripe confirmPayment
 */
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { checkoutApi } from '@/lib/api';
import { useCart } from '@/contexts/CartContext'; // Import useCart hook

export function CheckoutSuccessClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshCart } = useCart(); // Access cart context
  const orderNumber = searchParams?.get('orderNumber') || '';
  const email = searchParams?.get('email') || '';
  const paymentIntentId = searchParams?.get('payment_intent') || ''; // From Stripe return_url
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trigger cart refresh on mount to clear badge after successful purchase
  // The backend has already emptied the cart, but frontend needs to sync
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // Handle return_url from Stripe - confirm order if payment_intent is present
  useEffect(() => {
    if (paymentIntentId && !orderNumber && !isProcessing && !error) {
      setIsProcessing(true);

      // Retrieve payment intent status and confirm order
      // Note: In a real scenario, you might want to call an API endpoint to retrieve order details
      // For now, we'll redirect to a page that can handle the payment_intent
      // The backend webhook should have already processed the payment
      console.log(' Payment intent from return_url:', paymentIntentId);

      // The order should already be confirmed by webhook, but we can verify
      // For now, just show a message that payment is being processed
      setTimeout(() => {
        setIsProcessing(false);
        // In a production app, you might want to poll for order status or redirect
      }, 2000);
    }
  }, [paymentIntentId, orderNumber, isProcessing, error]);

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
      console.error(' Failed to copy order number:', err);
    }
  };

  // Show processing state if payment_intent is present but orderNumber is not yet available
  if (paymentIntentId && !orderNumber && isProcessing) {
    return (
      <div className="success-page">
        <div className="card">
          <div className="icon">⏳</div>
          <h1>Processing your payment...</h1>
          <p>Please wait while we confirm your order.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="success-page">
        <div className="card">
          <div className="icon">❌</div>
          <h1>Payment Processing Error</h1>
          <p>{error}</p>
          <div className="actions">
            <Link href="/checkout" className="btn-primary">
              Return to Checkout
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="success-page">
      <div className="card">
        <div className="icon">🎉</div>
        <h1>Your order is confirmed!</h1>
        <p>
          Thank you for your purchase. We&apos;ve emailed a receipt to <strong>{email || 'your inbox'}</strong>.
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

export default CheckoutSuccessClient;

