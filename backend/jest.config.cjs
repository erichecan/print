// Jest 配置占位，便于后续编写测试 [2025-11-10 13:02:00]
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: 'coverage',
};

