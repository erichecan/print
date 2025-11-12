/**
 * Account Overview Page
 * [2025-11-12 00:04:40] Added account hub prompting users to log in
 */
'use client';

import Link from 'next/link';

export default function AccountPage() {
  return (
    <section className="container" style={{ padding: '72px 0', display: 'grid', gap: '24px', maxWidth: '640px' }}>
      <h1>Your Account</h1>
      <p>
        Sign in to review orders, manage saved designs, and update your profile information. New here? Create
        an account to unlock faster checkout and collaboration tools.
      </p>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <Link className="btn" href="/login">
          Sign in
        </Link>
        <Link className="btn btn--outline" href="/register">
          Create account
        </Link>
        <Link className="btn btn--outline" href="/account/orders">
          View order history
        </Link>
      </div>
    </section>
  );
}

