/**
 * Referral 分享页 - 生成专属邀请链接
 * 复制链接按钮 + Toast 成功提示
 * 2025-02-20 创建
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';

export default function ReferralSharePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { success } = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      const redirect = encodeURIComponent('/referral/share');
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-slate-500">加载中...</p>
      </div>
    );
  }

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : '';
  const inviteUrl = `${baseUrl}/referral/invite?ref=${encodeURIComponent(user.id)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      success('链接已复制到剪贴板');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      success('请手动复制链接');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">分享邀请链接</h1>
      <p className="text-slate-600 mb-4">
        复制下方链接发给好友，好友通过链接购买后您将获得阶梯佣金。
      </p>
      <div className="rounded-lg bg-slate-100 p-4 mb-4 break-all text-sm text-slate-700">
        {inviteUrl}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-70"
      >
        {copied ? '已复制！' : '复制链接'}
      </button>
      <div className="mt-6">
        <Link
          href="/referral/dashboard"
          className="text-indigo-600 hover:text-indigo-700"
        >
          ← 返回控制台
        </Link>
      </div>
    </div>
  );
}
