/**
 * Account Layout Client Wrapper
 * [2025-12-18 22:55:00] Client Component wrapper，提供 AccountProvider
 */
'use client';

import { ReactNode } from 'react';
import { AccountProvider } from '@/contexts/AccountContext';

export function AccountLayoutClient({ children }: { children: ReactNode }) {
  return <AccountProvider>{children}</AccountProvider>;
}

