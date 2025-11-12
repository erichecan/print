/**
 * Checkout Success Page
 * [2025-11-12 00:45:10] 支付成功提示页
 */

import Link from 'next/link';

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const orderNumberParam = searchParams?.orderNumber;
  const emailParam = searchParams?.email;
  const orderNumber = Array.isArray(orderNumberParam)
    ? orderNumberParam[0]
    : orderNumberParam || '';
  const email = Array.isArray(emailParam) ? emailParam[0] : emailParam || '';

  const orderLink =
    orderNumber && email
      ? `/orders/${encodeURIComponent(orderNumber)}?email=${encodeURIComponent(email)}`
      : '/orders';

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
          <p className="order-number">
            Order number: <strong>{orderNumber}</strong>
          </p>
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


