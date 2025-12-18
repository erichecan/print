/**
 * Account Context
 * [2025-12-18 22:50:00] 账户状态管理 Context，提供统一的账户数据访问
 */
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useUser } from '@/hooks/useAccount';
import { type UserProfile } from '@/lib/api';

interface AccountContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  error: Error | undefined;
  refreshUser: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined);

/**
 * Account Provider
 * 提供账户状态给子组件
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const { user, isLoading, error, mutate } = useUser();

  const refreshUser = async () => {
    await mutate();
  };

  return (
    <AccountContext.Provider
      value={{
        user,
        isLoading,
        error,
        refreshUser,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

/**
 * 使用账户 Context
 */
export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}

