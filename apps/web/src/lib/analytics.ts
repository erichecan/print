/**
 * Design Lab Analytics & Tracking
* 实现PRD v3.0第1章的目标指标收集
 * 
 * 目标指标：
 * - 设计完成率
 * - 进入报价率
 * - 加车率
 * - 结账率
 * - 客服触达率
 * - 设计器交互满意度（含上传体验评分）
 */
'use client';

export type DesignLabEventType =
  | 'design_lab_opened'
  | 'design_lab_closed'
  | 'design_started'
  | 'design_saved'
  | 'design_completed'
  | 'upload_success'
  | 'upload_failed'
  | 'text_added'
  | 'art_added'
  | 'product_color_changed'
  | 'names_numbers_added'
  | 'get_price_clicked'
  | 'get_price_completed'
  | 'add_to_cart_clicked'
  | 'add_to_cart_success'
  | 'checkout_started'
  | 'checkout_completed'
  | 'customer_service_clicked'
  | 'upload_rating_submitted';

export interface DesignLabEvent {
  type: DesignLabEventType;
  timestamp: string;
  userId?: string;
  sessionId: string;
  designId?: string;
  metadata?: Record<string, any>;
}

export interface UploadRating {
  uploadId: string;
  rating: number; // 1-5
  comment?: string;
  userId?: string;
}

class DesignLabAnalytics {
  private sessionId: string;
  private events: DesignLabEvent[] = [];
  private readonly MAX_EVENTS_IN_MEMORY = 100;

  constructor() {
    // 生成或获取session ID
    this.sessionId = this.getOrCreateSessionId();
    // 加载已保存的事件
    this.loadEventsFromStorage();
    // 定期发送事件到后端
    this.startEventFlush();
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'server-session';
    
    let sessionId = sessionStorage.getItem('design_lab_session_id');
    if (!sessionId) {
      sessionId = `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('design_lab_session_id', sessionId);
    }
    return sessionId;
  }

  private loadEventsFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('design_lab_events');
      if (stored) {
        this.events = JSON.parse(stored).slice(-this.MAX_EVENTS_IN_MEMORY);
      }
    } catch (error) {
      console.warn('[Analytics] Failed to load events from storage:', error);
    }
  }

  private saveEventsToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('design_lab_events', JSON.stringify(this.events));
    } catch (error) {
      console.warn('[Analytics] Failed to save events to storage:', error);
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      const response = await fetch('/api/design-lab/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: eventsToSend }),
      });

      if (!response.ok) {
        // 如果发送失败，恢复事件到队列
        this.events = [...eventsToSend, ...this.events].slice(-this.MAX_EVENTS_IN_MEMORY);
        throw new Error(`Failed to send events: ${response.status}`);
      }

      // 发送成功，清除本地存储
      localStorage.removeItem('design_lab_events');
    } catch (error) {
      console.warn('[Analytics] Failed to flush events:', error);
      // 保存到本地存储以便稍后重试
      this.saveEventsToStorage();
    }
  }

  private startEventFlush(): void {
    if (typeof window === 'undefined') return;
    
    // 每30秒刷新一次
    setInterval(() => {
      this.flushEvents();
    }, 30000);

    // 页面卸载时立即刷新
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        // 使用 sendBeacon 确保事件被发送
        if (this.events.length > 0) {
          const blob = new Blob([JSON.stringify({ events: this.events })], {
            type: 'application/json',
          });
          navigator.sendBeacon('/api/design-lab/analytics/events', blob);
        }
      });
    }
  }

  /**
   * 记录事件
   */
  track(eventType: DesignLabEventType, metadata?: Record<string, any>): void {
    const event: DesignLabEvent = {
      type: eventType,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      metadata,
    };

    // 尝试从localStorage获取userId（如果已登录）
    if (typeof window !== 'undefined') {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          event.userId = user.id;
        }
      } catch (error) {
        // 忽略错误
      }
    }

    this.events.push(event);

    // 限制内存中的事件数量
    if (this.events.length > this.MAX_EVENTS_IN_MEMORY) {
      this.events = this.events.slice(-this.MAX_EVENTS_IN_MEMORY);
    }

    // 保存到本地存储
    this.saveEventsToStorage();

    // 立即发送关键事件
    if (this.isCriticalEvent(eventType)) {
      this.flushEvents();
    }
  }

  private isCriticalEvent(eventType: DesignLabEventType): boolean {
    return [
      'design_completed',
      'get_price_completed',
      'add_to_cart_success',
      'checkout_completed',
    ].includes(eventType);
  }

  /**
   * 提交上传体验评分
   */
  async submitUploadRating(rating: UploadRating): Promise<void> {
    try {
      const response = await fetch('/api/design-lab/upload-rating', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rating),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit rating: ${response.status}`);
      }

      // 记录评分事件
      this.track('upload_rating_submitted', {
        uploadId: rating.uploadId,
        rating: rating.rating,
      });
    } catch (error) {
      console.error('[Analytics] Failed to submit upload rating:', error);
      throw error;
    }
  }

  /**
   * 获取当前session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

// 单例实例
let analyticsInstance: DesignLabAnalytics | null = null;

export function getAnalytics(): DesignLabAnalytics {
  if (!analyticsInstance) {
    analyticsInstance = new DesignLabAnalytics();
  }
  return analyticsInstance;
}

// 便捷方法
export const analytics = {
  track: (eventType: DesignLabEventType, metadata?: Record<string, any>) => {
    getAnalytics().track(eventType, metadata);
  },
  submitUploadRating: (rating: UploadRating) => {
    return getAnalytics().submitUploadRating(rating);
  },
  getSessionId: () => {
    return getAnalytics().getSessionId();
  },
};

