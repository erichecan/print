// Application constants

const USER_ROLES = {
  CUSTOMER: 'customer',
  ADMIN: 'admin'
};

const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

const PAYMENT_METHOD = {
  STRIPE: 'stripe',
  PAYPAL: 'paypal',
  BANK_TRANSFER: 'bank_transfer'
};

const DESIGN_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PUBLISHED: 'published'
};

const ADDRESS_TYPE = {
  SHIPPING: 'shipping',
  BILLING: 'billing'
};

const FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
  DESIGN: ['application/json', 'image/svg+xml']
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

const RATE_LIMIT = {
  ANONYMOUS: 60, // requests per minute
  AUTHENTICATED: 300,
  ADMIN: 600
};

module.exports = {
  USER_ROLES,
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  DESIGN_STATUS,
  ADDRESS_TYPE,
  FILE_TYPES,
  MAX_FILE_SIZE,
  PAGINATION,
  RATE_LIMIT
};

