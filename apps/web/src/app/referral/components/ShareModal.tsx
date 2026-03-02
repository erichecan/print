/**
 * 付款成功后 / 分享时弹出的发 INS、Facebook、小红书
 * 复用社交海报内容，便于用户复制/分享
 * 2026-02-21 创建
 */
'use client';

import { SocialPosterTabs } from './SocialPosterTabs';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
}

export function ShareModal({ open, onClose, title = '分享到社交平台' }: ShareModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white max-w-lg w-full max-h-[90vh] overflow-auto border border-[#E8E8E8]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[#E8E8E8] flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-[#0D0D0D]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-[#FAFAFA] text-[#7A7A7A]"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        <div className="p-4">
          <SocialPosterTabs />
        </div>
      </div>
    </div>
  );
}
