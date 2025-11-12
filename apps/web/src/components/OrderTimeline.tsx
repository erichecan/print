/**
 * Order Timeline Component
 * [2025-01-27 12:05:00] 订单状态时间线组件，显示订单状态变更历史
 */
import React from 'react';

export interface OrderTimelineEvent {
  date: string;
  status: string;
  description?: string;
  isCurrent?: boolean;
}

interface OrderTimelineProps {
  events: OrderTimelineEvent[];
  currentStatus: string;
  className?: string;
}

export function OrderTimeline({ events, currentStatus, className = '' }: OrderTimelineProps) {
  // [2025-01-27 12:05:00] 根据订单状态生成默认时间线事件
  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      PENDING: 'Order Placed',
      PROCESSING: 'Processing',
      SHIPPED: 'Shipped',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
      REFUNDED: 'Refunded',
    };
    return statusMap[status.toUpperCase()] || status;
  };

  const getStatusIcon = (status: string, isCurrent: boolean): string => {
    if (isCurrent) {
      return '●';
    }
    const iconMap: Record<string, string> = {
      PENDING: '○',
      PROCESSING: '○',
      SHIPPED: '○',
      DELIVERED: '✓',
      CANCELLED: '✕',
      REFUNDED: '↻',
    };
    return iconMap[status.toUpperCase()] || '○';
  };

  // 如果没有事件，根据当前状态生成默认时间线
  const timelineEvents: OrderTimelineEvent[] =
    events.length > 0
      ? events
      : [
          {
            date: new Date().toISOString(),
            status: currentStatus,
            description: `Order is currently ${getStatusLabel(currentStatus).toLowerCase()}`,
            isCurrent: true,
          },
        ];

  return (
    <div className={`order-timeline ${className}`}>
      <h3>Order Status Timeline</h3>
      <div className="timeline">
        {timelineEvents.map((event, index) => {
          const isCurrent = event.isCurrent || index === timelineEvents.length - 1;
          const isPast = index < timelineEvents.length - 1;
          return (
            <div
              key={`${event.date}-${index}`}
              className={`timeline-item${isCurrent ? ' is-current' : ''}${isPast ? ' is-past' : ''}`}
            >
              <div className="timeline-marker">
                <span className="timeline-icon">{getStatusIcon(event.status, isCurrent)}</span>
              </div>
              <div className="timeline-content">
                <div className="timeline-status">{getStatusLabel(event.status)}</div>
                {event.description && <p className="timeline-description">{event.description}</p>}
                <time className="timeline-date">
                  {new Date(event.date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        .order-timeline {
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        h3 {
          margin: 0 0 20px 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
        }
        .timeline {
          position: relative;
          padding-left: 32px;
        }
        .timeline::before {
          content: '';
          position: absolute;
          left: 11px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #e2e8f0;
        }
        .timeline-item {
          position: relative;
          margin-bottom: 24px;
        }
        .timeline-item:last-child {
          margin-bottom: 0;
        }
        .timeline-item.is-past .timeline-icon {
          color: #10b981;
        }
        .timeline-item.is-current .timeline-icon {
          color: #2563eb;
          font-size: 1.25rem;
        }
        .timeline-marker {
          position: absolute;
          left: -21px;
          top: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border-radius: 50%;
        }
        .timeline-icon {
          font-size: 0.875rem;
          color: #94a3b8;
        }
        .timeline-content {
          padding-left: 8px;
        }
        .timeline-status {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 4px;
        }
        .timeline-description {
          margin: 4px 0;
          color: #64748b;
          font-size: 0.875rem;
        }
        .timeline-date {
          font-size: 0.75rem;
          color: #94a3b8;
        }
        .timeline-item.is-current .timeline-status {
          color: #2563eb;
        }
      `}</style>
    </div>
  );
}

