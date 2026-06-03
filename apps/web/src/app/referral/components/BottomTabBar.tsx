'use client';

export type ReferralTab = 'progress' | 'share' | 'rewards';

interface Tab {
  id: ReferralTab;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'progress', label: '我的进度', icon: '📊' },
  { id: 'share', label: '邀请分享', icon: '🔗' },
  { id: 'rewards', label: '奖励明细', icon: '💰' },
];

interface BottomTabBarProps {
  active: ReferralTab;
  onChange: (tab: ReferralTab) => void;
}

export function BottomTabBar({ active, onChange }: BottomTabBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E8E8] flex z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors relative"
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span
              className="text-[11px] font-medium"
              style={{ color: isActive ? '#04954A' : '#999' }}
            >
              {tab.label}
            </span>
            {isActive && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-[#07C160] rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
