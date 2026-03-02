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
      <div className="container mx-auto px-8 py-10">
        <p className="text-[#7A7A7A]">加载中...</p>
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
    <div className="container mx-auto px-8 py-10 max-w-2xl">
      <h1 className="text-lg font-bold text-[#0D0D0D] mb-6">分享邀请链接</h1>
      <p className="text-sm text-[#7A7A7A] mb-4">
        复制下方链接发给好友，好友通过链接购买后您将获得阶梯佣金。
      </p>
      <div className="bg-[#FAFAFA] p-4 mb-4 break-all text-xs text-[#0D0D0D] border border-[#E8E8E8]">
        {inviteUrl}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="w-full bg-[#E42313] px-4 py-3 font-medium text-white hover:bg-[#c51f11] disabled:opacity-70"
      >
        {copied ? '已复制！' : '复制链接'}
      </button>
      <div className="mt-6">
        <Link
          href="/referral/dashboard"
          className="text-[#E42313] hover:text-[#c51f11]"
        >
          ← 返回控制台
        </Link>
      </div>
    </div>
  );
}
