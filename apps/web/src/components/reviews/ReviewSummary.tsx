'use client';

import { StarRating } from './StarRating';

interface ReviewSummaryProps {
  average: number;
  count: number;
  distribution: Record<number, number>;
}

export function ReviewSummary({ average, count, distribution }: ReviewSummaryProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-6 p-4 bg-gray-50 rounded-lg">
      <div className="flex flex-col items-center justify-center min-w-[100px]">
        <span className="text-5xl font-bold text-gray-900">{average.toFixed(1)}</span>
        <StarRating rating={average} size="md" />
        <span className="text-sm text-gray-500 mt-1">{count} review{count !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const starCount = distribution[star] || 0;
          const pct = count > 0 ? Math.round((starCount / count) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-sm">
              <span className="w-6 text-right text-gray-600">{star}</span>
              <span className="text-yellow-400 text-xs">★</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 text-gray-500">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
