/**
 * Checkout Failure Page
 * [2025-11-12 00:45:10] 支付失败提示页
 */

import Link from 'next/link';

export default function CheckoutFailurePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const reasonParam = searchParams?.reason;
  const reason = Array.isArray(reasonParam) ? reasonParam[0] : reasonParam || '';

  return (
    <div className="failure-page">
      <div className="card">
        <div className="icon">⚠️</div>
        <h1>Payment could not be completed</h1>
        <p>
          We weren&apos;t able to finish your checkout. The most common causes are incorrect card
          details or bank verification issues.
        </p>
        {reason && <p className="reason">Details: {reason}</p>}
        <p>
          Please double-check your card information or try a different payment method. You can also
          reach out to our support team for assistance at{' '}
          <a href="mailto:support@print.dev">support@print.dev</a>.
        </p>
        <div className="actions">
          <Link href="/checkout" className="btn-primary">
            Try checkout again
          </Link>
          <Link href="/cart" className="btn-outline">
            Review cart
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
        .reason {
          background: #fef2f2;
          color: #b91c1c;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
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


