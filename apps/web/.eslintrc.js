// Next.js 前端 ESLint 配置 [2025-11-10 12:25:00]
// [2025-12-09 23:50:00] 添加 import/no-cycle 规则检测循环依赖
module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  plugins: ['import'],
  rules: {
    'import/no-cycle': 'error',
  },
};

