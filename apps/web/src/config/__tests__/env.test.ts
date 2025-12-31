/**
 * Environment Configuration Tests
* Design Lab 4.0: env 校验测试
 */

import { getFrontendApiBaseUrl, validateEnvAtBuildTime } from '../env';

describe('Environment Configuration', () => {
  const originalEnv = process.env;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('validateEnvAtBuildTime', () => {
    it('生产环境缺失环境变量应抛错', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.NEXT_PUBLIC_API_URL;
      delete process.env.NEXT_PUBLIC_API_BASE_URL;

      expect(() => validateEnvAtBuildTime()).toThrow();
    });

    it('生产环境 localhost 应抛错', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

      expect(() => validateEnvAtBuildTime()).toThrow();
    });

    it('开发环境允许 localhost', () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

      expect(() => validateEnvAtBuildTime()).not.toThrow();
    });
  });

  describe('getFrontendApiBaseUrl', () => {
    it('生产环境缺失环境变量应抛错', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.NEXT_PUBLIC_API_URL;
      delete process.env.NEXT_PUBLIC_API_BASE_URL;

      expect(() => getFrontendApiBaseUrl()).toThrow();
    });

    it('生产环境 localhost 应抛错', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

      expect(() => getFrontendApiBaseUrl()).toThrow();
    });

    it('开发环境允许回退到 localhost', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.NEXT_PUBLIC_API_URL;
      delete process.env.NEXT_PUBLIC_API_BASE_URL;

      const url = getFrontendApiBaseUrl();
// 修复：默认本地后端端口与仓库测试/脚本对齐为 4000
      expect(url).toBe('http://localhost:3001/api');
    });
  });
});

