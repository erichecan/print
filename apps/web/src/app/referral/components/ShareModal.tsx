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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-[#1C1C1C] border border-[#2A2A2A] max-w-lg w-full max-h-[90vh] overflow-auto rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between sticky top-0 bg-[#1C1C1C]">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-[#242424] text-[#666] rounded-lg transition-colors"
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
