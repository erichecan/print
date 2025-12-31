/**
 * Account Overview Page
* Redirect to Orders page by default as requested
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ACCOUNT_ROUTES } from '@/lib/routes/account';

export default function AccountPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(ACCOUNT_ROUTES.orders);
  }, [router]);

  return (
    <div style={{ padding: '48px', textAlign: 'center' }}>
      <p>Redirecting to orders...</p>
    </div>
  );
}
