/**
 * Jest Setup
* Jest 测试环境设置
* 调整为 CommonJS 语法以兼容 Jest 设置文件
 */
const React = require('react');

require('@testing-library/jest-dom');

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock Stripe
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() =>
    Promise.resolve({
      elements: jest.fn(() => ({
        create: jest.fn(),
      })),
    })
  ),
}));

jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }) => React.createElement('div', null, children),
  CardElement: () =>
    React.createElement('div', { 'data-testid': 'card-element' }, 'Card Element'),
  useStripe: () => ({
    confirmCardPayment: jest.fn(),
  }),
  useElements: () => ({
    getElement: jest.fn(),
  }),
}));

// Mock styled-jsx to avoid useInsertionEffect error in tests
jest.mock('styled-jsx/style', () => {
  const Style = ({ children }) => children;
  Style.default = Style;
  return Style;
});

