/**
 * Account Routes Configuration
* 统一管理账户相关路由，避免硬编码路径分散
 */
export const ACCOUNT_ROUTES = {
  dashboard: '/account',
  orders: '/account/orders',
  orderDetail: (id: string) => `/account/orders/${id}`,
  billing: '/account/billing',
  paymentMethods: '/account/billing/payment-methods',
  addresses: '/account/addresses',
  profile: '/account/profile',
  team: '/account/team',
  assets: '/account/assets',
  notifications: '/account/notifications',
  support: '/account/support',
  rewards: '/account/rewards',
  designs: '/account/designs',
  uploads: '/account/uploads',
  groupOrders: '/account/group-orders',
  fundraising: '/account/fundraising',
  stores: '/account/stores',
  settings: '/account/settings',
} as const;
