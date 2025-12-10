/**
 * API Client Tests
 * [2025-01-30 23:00:00] Design Lab 4.0: apiClient 错误分类测试
 */

import { apiClient, ApiError, ApiErrorType } from '../apiClient';

// Mock fetch
global.fetch = jest.fn();

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('401 错误应分类为 UNAUTHORIZED', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ message: 'Unauthorized' }),
    });

    await expect(apiClient('/test')).rejects.toThrow(ApiError);
    await expect(apiClient('/test')).rejects.toMatchObject({
      type: ApiErrorType.UNAUTHORIZED,
    });
  });

  it('404 错误应分类为 NOT_FOUND', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ message: 'Not Found' }),
    });

    await expect(apiClient('/test')).rejects.toThrow(ApiError);
    await expect(apiClient('/test')).rejects.toMatchObject({
      type: ApiErrorType.NOT_FOUND,
    });
  });

  it('500 错误应分类为 SERVER_ERROR', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ message: 'Internal Server Error' }),
    });

    await expect(apiClient('/test')).rejects.toThrow(ApiError);
    await expect(apiClient('/test')).rejects.toMatchObject({
      type: ApiErrorType.SERVER_ERROR,
    });
  });

  it('网络错误应分类为 NETWORK_ERROR', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiClient('/test')).rejects.toThrow(ApiError);
    await expect(apiClient('/test')).rejects.toMatchObject({
      type: ApiErrorType.NETWORK_ERROR,
    });
  });

  it('超时错误应分类为 TIMEOUT', async () => {
    const abortController = new AbortController();
    (global.fetch as jest.Mock).mockImplementation(() => {
      abortController.abort();
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    });

    await expect(apiClient('/test', { timeout: 1 })).rejects.toThrow(ApiError);
    await expect(apiClient('/test', { timeout: 1 })).rejects.toMatchObject({
      type: ApiErrorType.TIMEOUT,
    });
  });
});

