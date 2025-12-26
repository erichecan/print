/**
 * Jest Configuration
 * [2025-01-27 11:30:00] Jest 测试配置
 */
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/e2e/',
    '<rootDir>/tests/',
    '<rootDir>/src/hooks/__tests__/useAddToCart.test.ts',
    '<rootDir>/src/lib/__tests__/apiClient.test.ts',
    '<rootDir>/src/app/account/__tests__/designMerger.test.ts',
    '<rootDir>/src/config/__tests__/env.test.ts',
    '<rootDir>/src/hooks/__tests__/useBuyNow.test.ts',
    '<rootDir>/src/components/__tests__/LoadingSpinner.test.tsx'
  ],
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);

