// Next.js 前端 ESLint 配置 
// 添加 import/no-cycle 规则检测循环依赖
module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  plugins: ['import'],
  rules: {
    'import/no-cycle': 'error',
  },
};

