/**
 * Simulate Friend Purchase 测试按钮
 * 仅开发环境可见，模拟被邀请人购买，为当前推广者增加一次成功推荐
 * 2025-02-20 创建
 */
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReferral } from '@/contexts/ReferralContext';
import { useToast } from '@/hooks/useToast';

export function SimulatePurchaseButton() {
  const { user } = useAuth();
  const { addReferral, referralCount, referralCap } = useReferral();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);

  if (process.env.NODE_ENV !== 'development') return null;

  const handleClick = () => {
    if (!user?.id) {
      showError('请先登录');
      return;
    }
    if (referralCount >= referralCap) {
      showError('已达最大推荐人数');
      return;
    }
    setLoading(true);
    const ok = addReferral(user.id);
    setLoading(false);
    if (ok) {
      success(`模拟成功！已为推广者增加第 ${referralCount + 1} 笔佣金`);
    } else {
      showError('已达最大推荐人数');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || referralCount >= referralCap}
      className="mt-4 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? '处理中...' : 'Simulate Friend Purchase (Dev)'}
    </button>
  );
}
