/**
 * Payment Method Controller
* Payment method management controller for Issue #112
 */
const paymentMethodService = require('../services/paymentMethodService');
const logger = require('../utils/logger');
const { BadRequestError, NotFoundError } = require('../utils/errors');

/**
 * GET /api/payment-methods - Get user's payment methods
 */
exports.getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const paymentMethods = await paymentMethodService.getUserPaymentMethods(userId);
    res.json({ paymentMethods });
  } catch (error) {
    logger.error('[Payment Method] Error getting payment methods:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    res.status(500).json({
      error: 'Failed to get payment methods',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * POST /api/payment-methods - Save payment method
 */
exports.savePaymentMethod = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { paymentMethodId, isDefault, billingDetails } = req.body || {};

    if (!paymentMethodId) {
      return res.status(400).json({
        error: 'Missing required field',
        required: ['paymentMethodId'],
      });
    }

    const savedPaymentMethod = await paymentMethodService.savePaymentMethod(
      userId,
      paymentMethodId,
      {
        isDefault: isDefault || false,
        billingDetails: billingDetails || null,
      }
    );

    res.status(201).json({ paymentMethod: savedPaymentMethod });
  } catch (error) {
    if (error.isOperational) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ error: error.message });
    }
    logger.error('[Payment Method] Error saving payment method:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    res.status(500).json({
      error: 'Failed to save payment method',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET /api/payment-methods/:id - Get payment method by ID
 */
exports.getPaymentMethod = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const paymentMethod = await paymentMethodService.getPaymentMethodById(id, userId);

    res.json({ paymentMethod });
  } catch (error) {
    if (error.isOperational && error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    if (error.isOperational && error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('[Payment Method] Error getting payment method:', {
      error: error.message,
      paymentMethodId: req.params.id,
      userId: req.user?.id,
    });
    res.status(500).json({
      error: 'Failed to get payment method',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * PATCH /api/payment-methods/:id/default - Set payment method as default
 */
exports.setDefaultPaymentMethod = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const paymentMethod = await paymentMethodService.setDefaultPaymentMethod(id, userId);

    res.json({ paymentMethod });
  } catch (error) {
    if (error.isOperational) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ error: error.message });
    }
    logger.error('[Payment Method] Error setting default payment method:', {
      error: error.message,
      paymentMethodId: req.params.id,
      userId: req.user?.id,
    });
    res.status(500).json({
      error: 'Failed to set default payment method',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * DELETE /api/payment-methods/:id - Delete payment method
 */
exports.deletePaymentMethod = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    await paymentMethodService.deletePaymentMethod(id, userId);

    res.json({ success: true });
  } catch (error) {
    if (error.isOperational) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ error: error.message });
    }
    logger.error('[Payment Method] Error deleting payment method:', {
      error: error.message,
      paymentMethodId: req.params.id,
      userId: req.user?.id,
    });
    res.status(500).json({
      error: 'Failed to delete payment method',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

