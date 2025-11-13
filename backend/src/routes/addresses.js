/**
 * Address Routes
 * [2025-01-27 14:00:00] User address management routes
 */
const express = require('express');
const router = express.Router();
const {
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} = require('../controllers/addressController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// GET /api/addresses - List user's addresses
router.get('/', getAddresses);

// GET /api/addresses/:id - Get address by ID
router.get('/:id', getAddressById);

// POST /api/addresses - Create new address
router.post('/', createAddress);

// PUT /api/addresses/:id - Update address
router.put('/:id', updateAddress);

// DELETE /api/addresses/:id - Delete address
router.delete('/:id', deleteAddress);

// PATCH /api/addresses/:id/set-default - Set address as default
router.patch('/:id/set-default', setDefaultAddress);

module.exports = router;

