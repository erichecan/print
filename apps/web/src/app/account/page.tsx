/**
 * Account Overview Page
 * [2025-01-27] 账户概览页面，显示欢迎信息和空状态卡片
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi, ordersApi, designsApi, type UserProfile } from '@/lib/api';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [designsCount, setDesignsCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const data = await authApi.me();
        if (cancelled) return;
        setUser(data);
        const name = [data.firstName, data.lastName].filter(Boolean).join(' ') || data.email?.split('@')[0] || 'User';
        setDisplayName(name);
        
        // 加载设计数量
        try {
          const designsData = await designsApi.list();
          if (!cancelled) {
            setDesignsCount(designsData.designs?.length || 0);
          }
        } catch {
          // 忽略错误
        }
        
        // 加载订单数量
        try {
          const ordersData = await ordersApi.list(1, 1);
          if (!cancelled) {
            if ('orders' in ordersData) {
              setOrdersCount(ordersData.total || 0);
            } else if ('pagination' in ordersData) {
              setOrdersCount(ordersData.pagination?.total || 0);
            }
          }
        } catch {
          // 忽略错误
        }
      } catch {
        if (cancelled) return;
        // User not logged in
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  // [2025-12-06 13:00:00] 实现名称编辑功能
  const handleNameSave = async () => {
    if (!user) return;
    
    setNameError(null);
    setNameSuccess(false);
    
    // [2025-12-06 13:00:00] 验证名称
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setNameError('名称不能为空');
      return;
    }
    
    // [2025-12-06 13:00:00] 名称长度验证（最多 50 个字符）
    if (trimmedName.length > 50) {
      setNameError('名称长度不能超过 50 个字符');
      return;
    }
    
    // [2025-12-06 13:00:00] 名称格式验证（只允许字母、数字、空格、中文字符和常见标点）
    const nameRegex = /^[\u4e00-\u9fa5a-zA-Z0-9\s\-'.,]+$/;
    if (!nameRegex.test(trimmedName)) {
      setNameError('名称只能包含字母、数字、中文字符和常见标点符号');
      return;
    }
    
    // [2025-12-06 13:00:00] 检查名称是否改变
    const currentName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'User';
    if (trimmedName === currentName) {
      setEditingName(false);
      return;
    }
    
    setSavingName(true);
    
    try {
      // [2025-12-06 13:00:00] 将显示名称解析为 firstName 和 lastName
      // 简单策略：如果包含空格，第一个词作为 firstName，其余作为 lastName
      // 否则，整个名称作为 firstName
      const nameParts = trimmedName.split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || null;
      
      // [2025-12-06 13:00:00] 调用 API 更新用户信息
      await authApi.updateProfile({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });
      
      // [2025-12-06 13:00:00] 重新加载用户信息
      const updatedUser = await authApi.me();
      setUser(updatedUser);
      
      // [2025-12-06 13:00:00] 更新显示名称
      const updatedDisplayName = [updatedUser.firstName, updatedUser.lastName].filter(Boolean).join(' ') || updatedUser.email?.split('@')[0] || 'User';
      setDisplayName(updatedDisplayName);
      
      setNameSuccess(true);
      setEditingName(false);
      
      // [2025-12-06 13:00:00] 3 秒后清除成功提示
      setTimeout(() => {
        setNameSuccess(false);
      }, 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '保存名称失败，请稍后重试';
      setNameError(errorMessage);
      // [2025-12-06 13:00:00] 恢复原始名称
      const originalName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'User';
      setDisplayName(originalName);
    } finally {
      setSavingName(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>
        Loading...
      </div>
    );
  }

  // Not logged in - show login prompt
  if (!user) {
    return (
      <div style={{ padding: '48px', maxWidth: '640px', margin: '0 auto' }}>
        <h1>Your Account</h1>
        <p>
          Sign in to review orders, manage saved designs, and update your profile information. New here? Create
          an account to unlock faster checkout and collaboration tools.
        </p>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '24px' }}>
          <Link className="btn" href="/login">
            Sign in
          </Link>
          <Link className="btn btn--outline" href="/register">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '48px 0' }}>
      {/* 欢迎信息 */}
      <div style={{ marginBottom: '48px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 700, 
          margin: '0 0 8px 0',
          color: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          Welcome back,{' '}
          {editingName ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="text"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setNameError(null);
                }}
                onBlur={handleNameSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !savingName) {
                    handleNameSave();
                  } else if (e.key === 'Escape') {
                    setEditingName(false);
                    setNameError(null);
                    setDisplayName([user.firstName, user.lastName].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'User');
                  }
                }}
                disabled={savingName}
                autoFocus
                maxLength={50}
                style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  border: nameError ? '1px solid #ff1f3d' : '1px solid #2563eb',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  outline: 'none',
                  width: '200px',
                  opacity: savingName ? 0.6 : 1,
                }}
              />
              {nameError && (
                <div style={{ fontSize: '14px', color: '#ff1f3d', marginTop: '-4px' }}>
                  {nameError}
                </div>
              )}
              {nameSuccess && (
                <div style={{ fontSize: '14px', color: '#1f7d3d', marginTop: '-4px' }}>
                  ✅ 名称已更新
                </div>
              )}
              {savingName && (
                <div style={{ fontSize: '14px', color: '#666', marginTop: '-4px' }}>
                  正在保存...
                </div>
              )}
            </div>
          ) : (
            <>
              <span>{displayName}</span>
              <button
                type="button"
                onClick={() => setEditingName(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: 0.6,
                }}
                aria-label="Edit name"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </>
          )}
          !
        </h1>
        <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
          Here&apos;s an overview of your account.
        </p>
      </div>

      {/* My Designs 部分 */}
      <div style={{ marginBottom: '48px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 700, 
          margin: '0 0 24px 0',
          color: '#1f2937'
        }}>
          My Designs
        </h2>
        {designsCount === 0 ? (
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '64px 32px',
            textAlign: 'center',
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              margin: '0 auto 24px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {/* 文件夹图标 */}
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" style={{ color: '#9ca3af' }}>
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="currentColor" />
              </svg>
              {/* 鼠标光标图标 */}
              <svg 
                width="32" 
                height="32" 
                viewBox="0 0 24 24" 
                fill="none" 
                style={{ 
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  color: '#3b82f6',
                  transform: 'rotate(-15deg)'
                }}
              >
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" fill="currentColor" />
              </svg>
              {/* 闪光效果 */}
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#60a5fa',
                boxShadow: '0 0 12px rgba(96, 165, 250, 0.6)',
                animation: 'pulse 2s infinite',
              }} />
            </div>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: 600, 
              margin: '0 0 8px 0',
              color: '#1f2937'
            }}>
              No designs yet
            </h3>
            <p style={{ 
              fontSize: '16px', 
              color: '#6b7280', 
              margin: '0 0 24px 0'
            }}>
              Bring your first idea to life.
            </p>
            <Link
              href="/products"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '16px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
            >
              Start Designing
            </Link>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <p style={{ margin: 0, color: '#6b7280' }}>
              You have {designsCount} saved design{designsCount !== 1 ? 's' : ''}.
            </p>
            <Link
              href="/account/designs"
              style={{
                display: 'inline-block',
                marginTop: '16px',
                padding: '12px 24px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '16px',
              }}
            >
              View All Designs
            </Link>
          </div>
        )}
      </div>

      {/* Order History 部分 */}
      <div>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 700, 
          margin: '0 0 24px 0',
          color: '#1f2937'
        }}>
          Order History
        </h2>
        {ordersCount === 0 ? (
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '64px 32px',
            textAlign: 'center',
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              margin: '0 auto 24px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {/* 盒子图标 */}
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" style={{ color: '#9ca3af' }}>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill="currentColor" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="#ffffff" strokeWidth="2" />
                <line x1="12" y1="22.08" x2="12" y2="12" stroke="#ffffff" strokeWidth="2" />
              </svg>
              {/* 闪光效果 */}
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#60a5fa',
                boxShadow: '0 0 12px rgba(96, 165, 250, 0.6)',
                animation: 'pulse 2s infinite',
              }} />
            </div>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: 600, 
              margin: '0 0 8px 0',
              color: '#1f2937'
            }}>
              No orders yet
            </h3>
            <p style={{ 
              fontSize: '16px', 
              color: '#6b7280', 
              margin: '0 0 24px 0'
            }}>
              Browse our catalog to get started.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                href="/products"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '16px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1d4ed8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }}
              >
                Shop Products
              </Link>
              <Link
                href="/products?new=true"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  backgroundColor: '#ffffff',
                  color: '#2563eb',
                  border: '2px solid #2563eb',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '16px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#eff6ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                View New Arrivals
              </Link>
            </div>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <p style={{ margin: 0, color: '#6b7280' }}>
              You have {ordersCount} order{ordersCount !== 1 ? 's' : ''}.
            </p>
            <Link
              href="/account/orders"
              style={{
                display: 'inline-block',
                marginTop: '16px',
                padding: '12px 24px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '16px',
              }}
            >
              View All Orders
            </Link>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
