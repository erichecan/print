/**
 * Authentication Context
* Global authentication state management for customer users
 */
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, type UserProfile } from '@/lib/api';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  logout: (redirectUrl?: string) => Promise<void>;
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
      // 静默处理 401 错误（未登录是正常状态）
      // 静默处理后端服务不可用错误（500/503），这些错误不影响应用核心功能
      setUser(null);
      // UNAUTHORIZED 是预期的错误（用户未登录），不设置 error
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        setError(null);
      } else if (err instanceof Error) {
        // 如果是后端服务错误（500/503），静默处理，不影响应用使用
        const isServerError = err.message?.includes('500') ||
          err.message?.includes('503') ||
          err.message?.includes('Service Unavailable') ||
          err.message?.includes('Internal Server Error');
        if (isServerError) {
          // 后端服务不可用时，用户仍然可以使用应用（未登录状态），不设置 error
          setError(null);
          // 在开发环境记录警告，生产环境完全静默
          if (process.env.NODE_ENV === 'development') {
            console.warn('[AuthContext] 后端认证服务暂时不可用，应用将以未登录状态运行');
          }
        } else {
          // 其他错误才设置 error
          setError(err);
        }
      } else {
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async (redirectUrl: string = '/login') => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      // 无论后端请求是否成功，都清除用户状态
      setUser(null);
      setError(null);
      // Ensure local storage is cleared
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        // Clear any other auth related keys if needed
        localStorage.removeItem('offline-order-intake-draft'); // Optional: clear drafts on logout? Maybe keep it.
        // Force redirect
        window.location.href = redirectUrl;
      }
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

