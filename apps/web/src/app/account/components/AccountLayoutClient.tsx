/**
 * Account Layout Client Wrapper
* Client Component wrapper，提供 AccountProvider
 */
'use client';

import { ReactNode } from 'react';
import { AccountProvider } from '@/contexts/AccountContext';

export function AccountLayoutClient({ children }: { children: ReactNode }) {
  return <AccountProvider>{children}</AccountProvider>;
}

