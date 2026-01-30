/**
 * Payment Method Service
* Payment method management service for Issue #112
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { BadRequestError, NotFoundError } = require('../utils/errors');
const Stripe = require('stripe');

// Global Stripe Initialization to fail fast
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? Stripe(stripeSecretKey) : null;

if (!stripeSecretKey && process.env.NODE_ENV === 'production') {
  logger.warn('WARNING: STRIPE_SECRET_KEY is not set in paymentMethodService');
}


/**
 * Save payment method for user
 * @param {string} userId - User ID
 * @param {string} paymentMethodId - Stripe PaymentMethod ID
 * @param {Object} options - Options including isDefault, billingDetails
 * @returns {Promise<Object>} Saved payment method
 */
async function savePaymentMethod(userId, paymentMethodId, options = {}) {
  const { isDefault = false, billingDetails = null } = options;
  const timestamp = new Date().toISOString();

  try {
    // Verify payment method exists in Stripe
    if (!stripe) throw new Error('Stripe is not initialized');

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (!paymentMethod) {
      throw new BadRequestError('Payment method not found in Stripe');
    }

    // Extract card information
    const cardInfo = paymentMethod.card || {};
    const paymentMethodData = {
      userId,
      stripePaymentMethodId: paymentMethodId,
      type: paymentMethod.type || 'card',
      cardBrand: cardInfo.brand || null,
      cardLast4: cardInfo.last4 || null,
      cardExpMonth: cardInfo.exp_month || null,
      cardExpYear: cardInfo.exp_year || null,
      isDefault,
      billingDetails: billingDetails || paymentMethod.billing_details || null,
    };

    // If setting as default, unset other default payment methods
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Check if payment method already exists
    const existing = await prisma.paymentMethod.findUnique({
      where: { stripePaymentMethodId: paymentMethodId },
    });

    let savedPaymentMethod;
    if (existing) {
      // Update existing payment method
      savedPaymentMethod = await prisma.paymentMethod.update({
        where: { id: existing.id },
        data: paymentMethodData,
      });
    } else {
      // Create new payment method
      savedPaymentMethod = await prisma.paymentMethod.create({
        data: paymentMethodData,
      });
    }

    logger.info('Payment method saved', {
      timestamp,
      userId,
      paymentMethodId: savedPaymentMethod.id,
      stripePaymentMethodId: paymentMethodId,
      isDefault,
    });

    return savedPaymentMethod;
  } catch (error) {
    logger.error('Error saving payment method', {
      timestamp,
      userId,
      paymentMethodId,
      error: error.message,
      stack: error.stack,
    });

    if (error.isOperational) {
      throw error;
    }

    throw new BadRequestError(`Failed to save payment method: ${error.message}`);
  }
}

/**
 * Get user's payment methods
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of payment methods
 */
async function getUserPaymentMethods(userId) {
  try {
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return paymentMethods;
  } catch (error) {
    logger.error('Error fetching user payment methods', {
      error: error.message,
      userId,
    });
    throw error;
  }
}

/**
 * Get payment method by ID
 * @param {string} paymentMethodId - Payment method ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object>} Payment method
 */
async function getPaymentMethodById(paymentMethodId, userId) {
  try {
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod) {
      throw new NotFoundError('Payment method not found');
    }

    if (paymentMethod.userId !== userId) {
      throw new BadRequestError('Unauthorized access to payment method');
    }

    return paymentMethod;
  } catch (error) {
    if (error.isOperational) {
      throw error;
    }
    logger.error('Error fetching payment method', {
      error: error.message,
      paymentMethodId,
      userId,
    });
    throw error;
  }
}

/**
 * Set payment method as default
 * @param {string} paymentMethodId - Payment method ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated payment method
 */
async function setDefaultPaymentMethod(paymentMethodId, userId) {
  try {
    // Verify payment method belongs to user
    const paymentMethod = await getPaymentMethodById(paymentMethodId, userId);

    // Unset other default payment methods
    await prisma.paymentMethod.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    // Set this payment method as default
    const updated = await prisma.paymentMethod.update({
      where: { id: paymentMethodId },
      data: { isDefault: true },
    });

    logger.info('Payment method set as default', {
      paymentMethodId,
      userId,
    });

    return updated;
  } catch (error) {
    logger.error('Error setting default payment method', {
      error: error.message,
      paymentMethodId,
      userId,
    });
    throw error;
  }
}

/**
 * Delete payment method
 * @param {string} paymentMethodId - Payment method ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function deletePaymentMethod(paymentMethodId, userId) {
  try {
    // Verify payment method belongs to user
    await getPaymentMethodById(paymentMethodId, userId);

    // Delete payment method
    await prisma.paymentMethod.delete({
      where: { id: paymentMethodId },
    });

    logger.info('Payment method deleted', {
      paymentMethodId,
      userId,
    });
  } catch (error) {
    logger.error('Error deleting payment method', {
      error: error.message,
      paymentMethodId,
      userId,
    });
    throw error;
  }
}

/**
 * Attach payment method to customer in Stripe
 * @param {string} paymentMethodId - Stripe PaymentMethod ID
 * @param {string} customerId - Stripe Customer ID
 * @returns {Promise<Object>} Attached payment method
 */
async function attachPaymentMethodToCustomer(paymentMethodId, customerId) {
  try {
    if (!stripe) throw new Error('Stripe is not initialized');

    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    return paymentMethod;
  } catch (error) {
    logger.error('Error attaching payment method to customer', {
      error: error.message,
      paymentMethodId,
      customerId,
    });
    throw error;
  }
}

module.exports = {
  savePaymentMethod,
  getUserPaymentMethods,
  getPaymentMethodById,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  attachPaymentMethodToCustomer,
};

