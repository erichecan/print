/**
 * Order Routes
 * [2025-11-04 23:57:00]
 */
const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrderById,
  getOrderByOrderNumber,
  downloadInvoice,
  downloadInvoiceByOrderNumber,
} = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');

// GET /api/orders - List user's orders (auth required)
router.get('/', authenticate, getOrders);

// GET /api/orders/number/:orderNumber - Get order by order number (guest access with email)
router.get('/number/:orderNumber', getOrderByOrderNumber);

// GET /api/orders/:id - Get order details (auth required if user order)
router.get('/:id', getOrderById);

// GET /api/orders/:id/invoice - Download invoice (auth required)
router.get('/:id/invoice', authenticate, downloadInvoice);

// GET /api/orders/number/:orderNumber/invoice - Download invoice by order number (guest with email)
router.get('/number/:orderNumber/invoice', downloadInvoiceByOrderNumber);

module.exports = router;
