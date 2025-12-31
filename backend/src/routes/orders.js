/**
 * Order Routes
* Added order cancellation routes
 */
const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrderById,
  getOrderByOrderNumber,
  downloadInvoice,
  downloadInvoiceByOrderNumber,
  cancelOrder,
  canCancelOrder,
  getOrderTracking,
} = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');

// GET /api/orders - List user's orders (auth required)
router.get('/', authenticate, getOrders);

// GET /api/orders/number/:orderNumber - Get order by order number (guest access with email)
router.get('/number/:orderNumber', getOrderByOrderNumber);

// GET /api/orders/:id/tracking - Get order tracking (auth required if user order)
router.get('/:id/tracking', getOrderTracking);

// GET /api/orders/:id/can-cancel - Check if order can be cancelled (auth required)
router.get('/:id/can-cancel', authenticate, canCancelOrder);

// GET /api/orders/:id - Get order details (auth required if user order)
router.get('/:id', getOrderById);

// POST /api/orders/:id/cancel - Cancel order (auth required)
router.post('/:id/cancel', authenticate, cancelOrder);

// GET /api/orders/:id/invoice - Download invoice (auth required)
router.get('/:id/invoice', authenticate, downloadInvoice);

// GET /api/orders/number/:orderNumber/invoice - Download invoice by order number (guest with email)
router.get('/number/:orderNumber/invoice', downloadInvoiceByOrderNumber);

module.exports = router;
