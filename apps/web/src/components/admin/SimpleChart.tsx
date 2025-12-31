/**
 * Simple Chart Component
* 简单图表组件 for Issue #160
 */
interface SimpleChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  yKey: string;
  height?: number;
  color?: string;
}

export function SimpleChart({ data, xKey, yKey, height = 300, color = '#2563eb' }: SimpleChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => Number(d[yKey]) || 0));
  const padding = 40;
  const chartHeight = height - padding * 2;
  const chartWidth = 800;
  const barWidth = chartWidth / data.length - 4;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg width={Math.max(chartWidth, data.length * 60)} height={height} style={{ display: 'block' }}>
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const value = maxValue * ratio;
          const y = padding + chartHeight * (1 - ratio);
          return (
            <g key={ratio}>
              <line
                x1={padding}
                y1={y}
                x2={chartWidth + padding}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <text
                x={padding - 8}
                y={y + 4}
                fontSize="12"
                fill="#6b7280"
                textAnchor="end"
              >
                {value.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((item, index) => {
          const value = Number(item[yKey]) || 0;
          const barHeight = (value / maxValue) * chartHeight;
          const x = padding + index * (barWidth + 4);
          const y = padding + chartHeight - barHeight;

          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                opacity={0.8}
              />
              <text
                x={x + barWidth / 2}
                y={y - 4}
                fontSize="10"
                fill="#6b7280"
                textAnchor="middle"
              >
                {value.toFixed(0)}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - padding + 4}
                fontSize="10"
                fill="#6b7280"
                textAnchor="middle"
              >
                {String(item[xKey]).substring(0, 8)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

