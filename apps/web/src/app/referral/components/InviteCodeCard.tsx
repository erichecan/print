'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { generateInviteCode } from '../lib/inviteCode';

export function InviteCodeCard() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteCode = user ? generateInviteCode(user.id) : 'PNG----';
  const inviteLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/referral/invite?ref=${inviteCode}`
      : `https://printngoplus.com/referral/invite?ref=${inviteCode}`;

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl p-5">
      <p className="text-sm font-semibold text-[#1a1a1a] mb-4">我的邀请码</p>

      {/* Code display */}
      <div className="bg-[#F5F5F5] rounded-xl p-4 flex items-center justify-between mb-3">
        <p className="text-2xl font-bold tracking-[0.2em] text-[#1a1a1a]">{inviteCode}</p>
        <button
          type="button"
          onClick={handleCopyCode}
          className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          style={{
            background: copied ? '#E8F8EE' : '#07C160',
            color: copied ? '#04954A' : '#fff',
          }}
        >
          {copied ? '已复制' : '复制码'}
        </button>
      </div>

      {/* Link copy */}
      <button
        type="button"
        onClick={handleCopyLink}
        className="w-full flex items-center justify-between bg-[#F5F5F5] rounded-xl px-4 py-3 transition-colors"
      >
        <span className="text-xs text-[#888] truncate flex-1 text-left">
          {inviteLink}
        </span>
        <span
          className="text-xs font-medium ml-3 flex-shrink-0"
          style={{ color: copiedLink ? '#04954A' : '#888' }}
        >
          {copiedLink ? '✓ 已复制' : '复制链接'}
        </span>
      </button>
    </div>
  );
}
