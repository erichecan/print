/**
 * Referral 进度条组件
 * 显示 0/3、1/3、2/3、3/3 阶梯进度
 * 2025-02-20 创建
 */
'use client';

interface ProgressBarProps {
  current: number;
  cap: number;
}

export function ProgressBar({ current, cap }: ProgressBarProps) {
  const percent = cap > 0 ? Math.min(100, (current / cap) * 100) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm font-medium text-[#666] mb-1">
        <span>推广进度</span>
        <span>
          {current}/{cap}
        </span>
      </div>
      <div className="h-3 w-full bg-[#2A2A2A] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#E42313] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
