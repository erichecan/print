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
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#E42313] border-t-transparent animate-spin" />
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
    <div className="min-h-screen bg-[#0D0D0D] px-4 py-10 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-white mb-6">分享邀请链接</h1>
      <p className="text-sm text-[#666] mb-4">
        复制下方链接发给好友，好友通过链接购买后您将获得阶梯佣金。
      </p>
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 mb-4 break-all text-xs text-[#A0A0A0]">
        {inviteUrl}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="w-full py-3 font-medium rounded-xl transition-colors"
        style={{
          background: copied ? 'rgba(245,166,35,0.12)' : '#E42313',
          color: copied ? '#F5A623' : '#fff',
        }}
      >
        {copied ? '✓ 已复制链接' : '复制链接'}
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
