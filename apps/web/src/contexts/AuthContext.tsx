/**
 * Authentication Context
 * [2025-01-28 07:30:00] Global authentication state management for customer users
 */
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, type UserProfile } from '@/lib/api';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authApi.me();
      setUser(data);
    } catch (err: any) {
      // [2025-12-03 03:55:00] 静默处理 401 错误（未登录是正常状态）
      setUser(null);
      // UNAUTHORIZED 是预期的错误（用户未登录），不设置 error
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        setError(null);
      } else if (err instanceof Error) {
        // 其他错误才设置 error
        setError(err);
      } else {
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

