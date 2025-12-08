/**
 * Analytics Unit Tests
 * [2025-12-08] 测试埋点系统的核心功能
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analytics, getAnalytics } from '@/lib/analytics';

// Mock fetch
global.fetch = vi.fn();

describe('Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 清除 localStorage
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
  });

  it('应该创建单例实例', () => {
    const instance1 = getAnalytics();
    const instance2 = getAnalytics();
    expect(instance1).toBe(instance2);
  });

  it('应该生成唯一的 session ID', () => {
    const sessionId1 = analytics.getSessionId();
    expect(sessionId1).toBeTruthy();
    expect(sessionId1).toMatch(/^dl_\d+_[a-z0-9]+$/);
  });

  it('应该记录事件到内存', () => {
    analytics.track('design_lab_opened', { test: 'data' });
    
    // 检查事件是否被记录（通过检查localStorage）
    if (typeof window !== 'undefined') {
      const events = localStorage.getItem('design_lab_events');
      expect(events).toBeTruthy();
      
      if (events) {
        const parsedEvents = JSON.parse(events);
        expect(parsedEvents.length).toBeGreaterThan(0);
        expect(parsedEvents[parsedEvents.length - 1].type).toBe('design_lab_opened');
      }
    }
  });

  it('应该立即发送关键事件', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    analytics.track('design_completed', { designId: 'test-123' });

    // 等待异步操作
    await new Promise(resolve => setTimeout(resolve, 100));

    // 验证 fetch 被调用
    expect(global.fetch).toHaveBeenCalled();
  });

  it('应该提交上传体验评分', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Rating submitted successfully' }),
    });

    await analytics.submitUploadRating({
      uploadId: 'upload-123',
      rating: 5,
      comment: 'Great experience!',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/design-lab/upload-rating'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('应该处理评分提交失败', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    await expect(
      analytics.submitUploadRating({
        uploadId: 'upload-123',
        rating: 5,
      })
    ).rejects.toThrow();
  });
});

