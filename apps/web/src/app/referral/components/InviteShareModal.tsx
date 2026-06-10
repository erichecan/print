'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { generateInviteCode } from '../lib/inviteCode';
import { ShareTextCard } from './ShareTextCard';

interface InviteShareModalProps {
  open: boolean;
  onClose: () => void;
}

export function InviteShareModal({ open, onClose }: InviteShareModalProps) {
  const { user } = useAuth();
  const [linkCopied, setLinkCopied] = useState(false);

  if (!open) return null;

  const inviteCode = user ? generateInviteCode(user.id) : '';
  const inviteLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/referral/invite?ref=${inviteCode}`
      : `https://printngoplus.com/referral/invite?ref=${inviteCode}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75"
      onClick={onClose}
    >
      <div
        className="bg-[#1C1C1C] border border-[#2A2A2A] w-full sm:max-w-lg max-h-[92vh] overflow-auto rounded-t-3xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#3A3A3A]" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">邀请好友</h3>
            <p className="text-xs text-[#666] mt-0.5">选择平台，复制文案，立即发送</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#242424] flex items-center justify-center text-[#666] hover:bg-[#2A2A2A] transition-colors text-sm"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Invite link section */}
          <div>
            <p className="text-xs font-semibold text-[#666] uppercase tracking-wider mb-2">我的专属邀请链接</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2.5 min-w-0">
                <p className="text-xs text-[#A0A0A0] truncate">{inviteLink}</p>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                style={{
                  background: linkCopied ? 'rgba(245,166,35,0.12)' : '#242424',
                  color: linkCopied ? '#F5A623' : '#A0A0A0',
                  border: `1px solid ${linkCopied ? 'rgba(245,166,35,0.3)' : '#2A2A2A'}`,
                }}
              >
                {linkCopied ? '✓ 已复制' : '复制链接'}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#2A2A2A]" />
            <span className="text-xs text-[#444]">或者直接复制平台文案</span>
            <div className="flex-1 h-px bg-[#2A2A2A]" />
          </div>

          {/* Platform text copy */}
          <ShareTextCard compact />
        </div>
      </div>
    </div>
  );
}
