/**
 * Account Page Server Component Tests
 * [2025-01-27 18:50:00] 测试账户页面的服务端组件行为
 */
import { getSessionSafe, getAccountDataSafe } from '@/server/account';

// Mock Next.js headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn((name: string) => {
      if (name === 'token') {
        return { value: 'test-token' };
      }
      return null;
    }),
  })),
  headers: jest.fn(() => ({
    get: jest.fn((name: string) => {
      if (name === 'x-request-id' || name === 'x-trace-id') {
        return 'test-request-id';
      }
      return null;
    }),
  })),
}));

// Mock config/env
jest.mock('@/config/env', () => ({
  // [2025-12-19 15:24:45] 修复：默认本地后端端口与仓库测试/脚本对齐为 4000
  getBackendApiBaseUrl: jest.fn(() => 'http://localhost:4000/api'),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Account Server Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSessionSafe', () => {
    it('should return null when no token is present', async () => {
      const { cookies } = require('next/headers');
      cookies.mockReturnValueOnce({
        get: jest.fn(() => null),
      });

      const result = await getSessionSafe();
      expect(result.ok).toBe(false);
      expect(result.code).toBe('NO_TOKEN');
    });

    it('should return session when token is valid', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'user-123', email: 'test@example.com' }),
      });

      const result = await getSessionSafe();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.userId).toBe('user-123');
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('should return error when backend API fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const result = await getSessionSafe();
      expect(result.ok).toBe(false);
      expect(result.code).toBe('AUTH_FAILED');
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const result = await getSessionSafe();
      expect(result.ok).toBe(false);
      expect(result.code).toBe('NETWORK_ERROR');
    });

    it('should handle timeout errors', async () => {
      // Mock AbortController
      const mockAbortController = {
        signal: { aborted: false },
        abort: jest.fn(),
      };
      global.AbortController = jest.fn(() => mockAbortController) as any;
      
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        Object.assign(new Error('Request aborted'), { name: 'AbortError' })
      );

      const result = await getSessionSafe();
      expect(result.ok).toBe(false);
      expect(result.code).toBe('TIMEOUT');
    });

    it('should handle JSON parse errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      });

      const result = await getSessionSafe();
      expect(result.ok).toBe(false);
      expect(result.code).toBe('PARSE_ERROR');
    });

    it('should handle config errors (missing env vars)', async () => {
      const { getBackendApiBaseUrl } = require('@/config/env');
      getBackendApiBaseUrl.mockImplementationOnce(() => {
        throw new Error('生产环境未配置 API 地址环境变量');
      });

      const result = await getSessionSafe();
      expect(result.ok).toBe(false);
      expect(result.code).toBe('CONFIG_ERROR');
    });
  });

  describe('getAccountDataSafe', () => {
    it('should return account data when API calls succeed', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'user-123', email: 'test@example.com' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ orders: [] }),
        });

      const result = await getAccountDataSafe('user-123');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.user).toBeDefined();
        expect(result.data.orders).toBeDefined();
      }
    });

    it('should return error when user fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await getAccountDataSafe('user-123');
      expect(result.ok).toBe(false);
      expect(result.code).toBe('USER_FETCH_FAILED');
    });

    it('should handle partial failures gracefully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'user-123', email: 'test@example.com' }),
        })
        .mockRejectedValueOnce(new Error('Orders fetch failed'));

      const result = await getAccountDataSafe('user-123');
      // 即使订单获取失败，用户数据仍应返回
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.user).toBeDefined();
      }
    });
  });
});
