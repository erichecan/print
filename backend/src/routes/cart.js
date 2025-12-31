/**
 * Cart Routes
 */
const express = require('express');
const router = express.Router();
const {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
} = require('../controllers/cartController');
const { authenticateOptional } = require('../middleware/auth');

// All cart routes (optional auth for guest carts)
router.use(authenticateOptional);

// GET /api/cart - Get current cart
router.get('/', getCart);

// POST /api/cart/items - Add item to cart
router.post('/items', addItem);

// PATCH /api/cart/items/:id - Update item quantity
router.patch('/items/:id', updateItem);

// DELETE /api/cart/items/:id - Remove item from cart
router.delete('/items/:id', removeItem);

// DELETE /api/cart - Clear cart
router.delete('/', clearCart);

module.exports = router;
