'use client';

import { useReferral } from '@/contexts/ReferralContext';

interface MilestoneStep {
  index: number;
  label: string;
  amount: number;
  status: 'done' | 'current' | 'future';
}

export function MilestoneBar() {
  const { referralCount, referralCap, tierAmounts, loading } = useReferral();

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5">
        <div className="h-4 bg-gray-100 rounded w-32 mb-4" />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-1 h-12 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const steps: MilestoneStep[] = tierAmounts.slice(0, referralCap).map((amount, i) => ({
    index: i,
    label: `第${['一', '二', '三'][i]}单`,
    amount,
    status: i < referralCount ? 'done' : i === referralCount ? 'current' : 'future',
  }));

  return (
    <div className="bg-white rounded-2xl p-5">
      <p className="text-sm font-semibold text-[#1a1a1a] mb-4">邀请进度</p>
      <div className="flex gap-2">
        {steps.map((step, idx) => (
          <div key={step.index} className="flex-1 flex flex-col items-center gap-1.5">
            {/* connector line between steps */}
            <div className="w-full flex items-center">
              {idx > 0 && (
                <div
                  className="flex-1 h-0.5 rounded"
                  style={{ background: step.status !== 'future' || steps[idx - 1].status === 'done' ? '#07C160' : '#E5E5E5' }}
                />
              )}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{
                  background: step.status === 'done' ? '#07C160' : step.status === 'current' ? '#E8F8EE' : '#F5F5F5',
                  color: step.status === 'done' ? '#fff' : step.status === 'current' ? '#04954A' : '#B0B0B0',
                  border: step.status === 'current' ? '2px solid #07C160' : 'none',
                }}
              >
                {step.status === 'done' ? '✓' : idx + 1}
              </div>
              {idx < steps.length - 1 && (
                <div
                  className="flex-1 h-0.5 rounded"
                  style={{ background: step.status === 'done' ? '#07C160' : '#E5E5E5' }}
                />
              )}
            </div>
            <p className="text-xs text-[#888] mt-0.5">{step.label}</p>
            <p
              className="text-xs font-semibold"
              style={{ color: step.status === 'future' ? '#B0B0B0' : '#04954A' }}
            >
              ¥{step.amount}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-[#F0F0F0]">
        <p className="text-xs text-[#888] text-center">
          邀请满 {referralCap} 位好友完成购买 = 免费获得一套印刷服务
        </p>
      </div>
    </div>
  );
}
