/**
 * Stat Card Component
 * [2025-12-06 21:30:00] 统计卡片组件 for Issue #160
 */
interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

export function StatCard({ label, value, change, changeType = 'neutral' }: StatCardProps) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
      }}
    >
      <div
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#1f2937',
          marginBottom: '8px',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: change ? '8px' : 0,
        }}
      >
        {label}
      </div>
      {change && (
        <div
          style={{
            fontSize: '12px',
            color:
              changeType === 'positive'
                ? '#10b981'
                : changeType === 'negative'
                ? '#ef4444'
                : '#6b7280',
          }}
        >
          {change}
        </div>
      )}
    </div>
  );
}

