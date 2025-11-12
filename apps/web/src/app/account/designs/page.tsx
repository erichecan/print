/**
 * Saved Designs Page
 * [2025-11-12 00:05:00] Added placeholder for saved designs dashboard
 */
'use client';

import Link from 'next/link';

export default function AccountDesignsPage() {
  return (
    <section className="container" style={{ padding: '72px 0', display: 'grid', gap: '16px', maxWidth: '720px' }}>
      <h1>Saved Designs</h1>
      <p>
        Saved Design Lab projects will appear here once you start creating custom merch. Sign in to manage
        existing artwork, duplicate designs, or share proofs with your team.
      </p>
      <Link className="btn" href="/design-lab">
        Launch Design Lab
      </Link>
    </section>
  );
}

