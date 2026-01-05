/**
* Checkout Controller
* Enhanced with logging and email notification
* Enhanced with inventory management
*/
const prisma = require('../lib/prisma');
const Stripe = require('stripe');
// 延迟初始化 Stripe，确保环境变量已加载
const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey.trim() === '') {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return Stripe(secretKey);
};
const logger = require('../utils/logger');
const { sendOrderConfirmation } = require('../services/emailService');
const { checkMultipleStockAvailability, decreaseInventory } = require('../services/inventoryService');
const { getSettingValue } = require('../services/settingService');
const { BadRequestError } = require('../utils/errors');

const DEFAULT_SHIPPING_SETTINGS = {
  standard: {
    enabled: true,
    cost: 9.99,
    costUS: 12.99,
    costIntl: 15.99,
    estimatedDaysCA: 7,
    estimatedDaysUS: 10,
  },
  express: {
    enabled: true,
    cost: 19.99,
    costUS: 24.99,
    costIntl: 29.99,
    estimatedDaysCA: 3,
    estimatedDaysUS: 5,
  },
};

/**
 * Get or create cart helper (reuse from cartController logic)
 */
async function getOrCreateCart(userId, sessionId) {
  if (userId) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });
    }
    return cart;
  } else if (sessionId) {
    let cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { sessionId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });
    }
    return cart;
  }
  throw new Error('Either userId or sessionId must be provided');
}

/**
 * Calculate tax based on province/state
 */
function calculateTax(subtotal, province) {
  // Simple tax rates (Phase 1)
  const taxRates = {
    // Canada
    ON: 0.13, // HST
    BC: 0.12, // PST + GST
    QC: 0.14975, // GST + QST
    AB: 0.05, // GST only
    SK: 0.11, // PST + GST
    MB: 0.12, // PST + GST
    NB: 0.15, // HST
    NS: 0.15, // HST
    PE: 0.15, // HST
    NL: 0.15, // HST
    NT: 0.05, // GST only
    YT: 0.05, // GST only
    NU: 0.05, // GST only
    // USA - approximate average
    CA: 0.08,
    NY: 0.08,
    TX: 0.0825,
    FL: 0.06,
    default: 0.08, // Default 8%
  };

  const rate = taxRates[province?.toUpperCase()] || taxRates.default;
  return Math.round(subtotal * rate * 100) / 100;
}

/**
 * Calculate static shipping rates
 */
function calculateShipping(country, province, shippingMethod = 'standard', settings = DEFAULT_SHIPPING_SETTINGS) {
  const isCA = country?.toUpperCase() === 'CA' || country?.toUpperCase() === 'CAN';
  const isUS = country?.toUpperCase() === 'US' || country?.toUpperCase() === 'USA';

  const methodKey = shippingMethod === 'express' ? 'express' : 'standard';
  const method = settings[methodKey];

  // If method is disabled, fallback to standard or return 0/error (here we allow it if provided)
  if (!method) return 15.99; // Fallback safety

  if (isCA) return Number(method.cost);
  if (isUS) return Number(method.costUS || method.cost); // Fallback to base cost if US not defined

  return Number(method.costIntl || 15.99);
}

/**
 * Calculate promotion discount for cart items
* 计算促销活动折扣
 */
async function calculatePromotionDiscount(cartItems, subtotal) {
  try {
    if (!cartItems || cartItems.length === 0) {
      return { discount: 0, promotions: [] };
    }

    const now = new Date();
    let totalDiscount = 0;
    const appliedPromotions = [];

    // For each cart item, find the best promotion
    for (const item of cartItems) {
      const { variantId, quantity, priceSnapshot } = item;
      const unitPrice = Number(priceSnapshot);
      const itemSubtotal = unitPrice * quantity;

      // Get product ID from variant
      const variant = await prisma.variant.findUnique({
        where: { id: variantId },
        include: { product: { include: { category: true } } },
      });

      if (!variant) {
        continue;
      }

      const productId = variant.productId;
      const categoryId = variant.product.categoryId;

      // Find active promotions for this product
      // Include buy-get-free promotion fields for Issue #139
      // Find active promotions for this product
      // Include buy-get-free promotion fields for Issue #139
      const productPromotions = await prisma.promotion.findMany({
        where: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
          OR: [
            {
              products: {
                some: {
                  productId: productId,
                },
              },
            },
            {
              categories: {
                some: {
                  categoryId: categoryId,
                },
              },
            },
          ],
        },
      });

      if (productPromotions.length === 0) {
        continue;
      }

      // Select the promotion with the highest discount
      let bestPromotion = null;
      let bestDiscount = 0;

      for (const promotion of productPromotions) {
        // Check minimum order value
        if (promotion.minOrderValue && subtotal < Number(promotion.minOrderValue)) {
          continue;
        }

        // Calculate discount for this item
        // Support buy-get-free promotions for Issue #139
        let itemDiscount = 0;

        if (promotion.discountType === 'PERCENTAGE') {
          itemDiscount = (itemSubtotal * Number(promotion.discountValue)) / 100;
          // Apply max discount limit
          if (promotion.maxDiscount && itemDiscount > Number(promotion.maxDiscount)) {
            itemDiscount = Number(promotion.maxDiscount);
          }
        } else if (promotion.discountType === 'BUY_GET_FREE') {
          // Buy X Get Y Free: Calculate free items discount
          const buyQty = promotion.buyQuantity || 1;
          const getQty = promotion.getQuantity || 1;

          // Calculate how many "buy-get-free" sets can be applied
          const sets = Math.floor(quantity / (buyQty + getQty));
          const freeItems = sets * getQty;

          // Discount is the value of free items
          itemDiscount = freeItems * unitPrice;

          // Don't exceed item subtotal
          if (itemDiscount > itemSubtotal) {
            itemDiscount = itemSubtotal;
          }
        } else {
          // Fixed discount per item
          itemDiscount = Number(promotion.discountValue) * quantity;
          // Don't exceed item subtotal
          if (itemDiscount > itemSubtotal) {
            itemDiscount = itemSubtotal;
          }
        }

        if (itemDiscount > bestDiscount) {
          bestDiscount = itemDiscount;
          bestPromotion = promotion;
        }
      }

      if (bestPromotion && bestDiscount > 0) {
        totalDiscount += bestDiscount;
        appliedPromotions.push({
          promotionId: bestPromotion.id,
          promotionTitle: bestPromotion.title,
          productId: productId,
          discountAmount: Math.round(bestDiscount * 100) / 100,
          // Include buy-get-free promotion details for Issue #139
          promotionType: bestPromotion.discountType,
          buyQuantity: bestPromotion.buyQuantity,
          getQuantity: bestPromotion.getQuantity,
          giftProductId: bestPromotion.giftProductId,
          giftVariantId: bestPromotion.giftVariantId,
        });
      }
    }

    return {
      discount: Math.round(totalDiscount * 100) / 100,
      promotions: appliedPromotions,
    };
  } catch (error) {
    logger.error('[checkoutController] calculatePromotionDiscount error:', error);
    return { discount: 0, promotions: [] };
  }
}

/**
 * Validate coupon and calculate discount
* 验证优惠券并计算折扣金额
 */
async function validateCouponAndCalculateDiscount(couponCode, subtotal, userId = null) {
  if (!couponCode) {
    return { discount: 0, coupon: null, error: null };
  }

  try {
    const now = new Date();
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: couponCode.toUpperCase().trim(),
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    if (!coupon) {
      return { discount: 0, coupon: null, error: 'Invalid or expired coupon code' };
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return { discount: 0, coupon: null, error: 'Coupon has reached its usage limit' };
    }

    // Check user usage limit
    if (userId && coupon.userUsageLimit) {
      const userUsageCount = await prisma.orderCoupon.count({
        where: {
          couponId: coupon.id,
          userId: userId,
        },
      });

      if (userUsageCount >= coupon.userUsageLimit) {
        return { discount: 0, coupon: null, error: 'You have already used this coupon the maximum number of times' };
      }
    }

    // Check minimum order value
    if (coupon.minOrderValue && Number(subtotal) < Number(coupon.minOrderValue)) {
      return {
        discount: 0,
        coupon: null,
        error: `Minimum order value of $${Number(coupon.minOrderValue).toFixed(2)} required`,
      };
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = (Number(subtotal) * Number(coupon.value)) / 100;
      // Apply max discount limit
      if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
        discountAmount = Number(coupon.maxDiscount);
      }
    } else {
      // Fixed discount
      discountAmount = Number(coupon.value);
      // Don't exceed subtotal
      if (discountAmount > Number(subtotal)) {
        discountAmount = Number(subtotal);
      }
    }

    return {
      discount: Math.round(discountAmount * 100) / 100,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
      },
      error: null,
    };
  } catch (error) {
    logger.error('Error validating coupon:', error);
    return { discount: 0, coupon: null, error: 'Failed to validate coupon' };
  }
}

/**
 * POST /api/checkout/prepare - Prepare checkout
 */
exports.prepareCheckout = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const sessionId = req.sessionId || null;
    const { shippingAddress, shippingMethod = 'standard', couponCode } = req.body || {}; // 支持优惠券代码

    const cart = await getOrCreateCart(userId, sessionId);

    if (cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Calculate subtotal
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + Number(item.priceSnapshot) * item.quantity;
    }, 0);

    // Calculate promotion discount
    const promotionResult = await calculatePromotionDiscount(cart.items, subtotal);
    const promotionDiscount = promotionResult.discount || 0;

    // Calculate subtotal after promotion discount
    const subtotalAfterPromotion = subtotal - promotionDiscount;

    // Validate coupon and calculate discount (on subtotal after promotion)
    const couponResult = await validateCouponAndCalculateDiscount(couponCode, subtotalAfterPromotion, userId);
    const couponDiscount = couponResult.discount || 0;

    // Total discount is promotion + coupon
    const totalDiscount = promotionDiscount + couponDiscount;

    let shippingCost = 0;
    let tax = 0;

    if (shippingAddress?.country && shippingAddress?.province) {
      // 当地址完整时返回运费与税费估算
      shippingCost = calculateShipping(
        shippingAddress.country,
        shippingAddress.province,
        shippingMethod,
        shippingSettings
      );
      // Tax is calculated on subtotal minus all discounts
      tax = calculateTax(subtotalAfterPromotion - couponDiscount, shippingAddress.province);
    }

    const total = subtotal - totalDiscount + shippingCost + tax;

    res.json({
      subtotal: Math.round(subtotal * 100) / 100,
      promotionDiscount: Math.round(promotionDiscount * 100) / 100, // 分开显示促销折扣
      discount: Math.round(totalDiscount * 100) / 100, // 总折扣（促销+优惠券）
      itemCount: cart.items.length,
      shipping: Math.round(shippingCost * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      items: cart.items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
        price: Number(item.priceSnapshot),
      })),
      ...(promotionResult.promotions && promotionResult.promotions.length > 0
        ? { promotions: promotionResult.promotions }
        : {}), // 返回应用的促销活动信息
      ...(couponResult.error ? { couponError: couponResult.error } : {}),
      ...(couponResult.coupon ? { coupon: couponResult.coupon } : {}),
    });
  } catch (error) {
    console.error('Error preparing checkout:', error);
    res.status(500).json({ error: 'Failed to prepare checkout' });
  }
};

/**
 * POST /api/checkout/shipping-rates - Get shipping rates
 */
exports.getShippingRates = async (req, res) => {
  try {
    const { address } = req.body;
    const settings = await getSettingValue('site.shipping', DEFAULT_SHIPPING_SETTINGS);

    if (!address || !address.country) {
      return res.status(400).json({ error: 'Address with country is required' });
    }

    // Phase 1: Static rates (Now dynamic)
    const isCA = address.country?.toUpperCase() === 'CA' || address.country?.toUpperCase() === 'CAN';
    const isUS = address.country?.toUpperCase() === 'US' || address.country?.toUpperCase() === 'USA';

    // Determine days based on location
    const stdDays = isCA ? settings.standard.estimatedDaysCA : (isUS ? settings.standard.estimatedDaysUS : 12);
    const expDays = isCA ? settings.express.estimatedDaysCA : (isUS ? settings.express.estimatedDaysUS : 7);

    const rates = [];

    if (settings.standard.enabled) {
      rates.push({
        id: 'standard',
        name: 'Standard Shipping',
        cost: calculateShipping(address.country, address.province, 'standard', settings),
        estimatedDays: stdDays,
      });
    }

    if (settings.express.enabled) {
      rates.push({
        id: 'express',
        name: 'Express Shipping',
        cost: calculateShipping(address.country, address.province, 'express', settings),
        estimatedDays: expDays,
      });
    }

    res.json({ rates });
  } catch (error) {
    console.error('Error getting shipping rates:', error);
    res.status(500).json({ error: 'Failed to get shipping rates' });
  }
};

/**
 * POST /api/checkout/create-payment-intent - Create Stripe PaymentIntent
* Enhanced: Added idempotencyKey, amount validation, draftOrderId support, capture_method
 */
exports.createPaymentIntent = async (req, res) => {
  try {
    const {
      shippingAddress,
      shippingMethod = 'standard',
      couponCode,
      draftOrderId, // Optional draft order ID
      amount, // Optional amount from frontend (for validation)
      currency = 'CAD',
      customerEmail, // Customer email for receipt
      metadata: additionalMetadata = {}, // Additional metadata
    } = req.body;
    const userId = req.user?.id || null;
    const sessionId = req.sessionId || null;

    const shippingSettings = await getSettingValue('site.shipping', DEFAULT_SHIPPING_SETTINGS);

    if (!shippingAddress) {
      return res.status(400).json({ error: 'Shipping address is required', errorCode: 'MISSING_ADDRESS' });
    }

    const cart = await getOrCreateCart(userId, sessionId);

    if (cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty', errorCode: 'EMPTY_CART' });
    }

    // Calculate totals
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + Number(item.priceSnapshot) * item.quantity;
    }, 0);

    // Calculate promotion discount
    const promotionResult = await calculatePromotionDiscount(cart.items, subtotal);
    const promotionDiscount = promotionResult.discount || 0;
    const subtotalAfterPromotion = subtotal - promotionDiscount;

    // Validate coupon and calculate discount (on subtotal after promotion)
    const couponResult = await validateCouponAndCalculateDiscount(couponCode, subtotalAfterPromotion, userId);
    if (couponResult.error) {
      return res.status(400).json({ error: couponResult.error, errorCode: 'INVALID_COUPON' });
    }
    const couponDiscount = couponResult.discount || 0;
    const totalDiscount = promotionDiscount + couponDiscount; // 总折扣

    const shippingCost = calculateShipping(shippingAddress.country, shippingAddress.province, shippingMethod, shippingSettings);
    // Tax is calculated on subtotal minus all discounts
    const tax = calculateTax(subtotalAfterPromotion - couponDiscount, shippingAddress.province);
    const calculatedTotal = subtotal - totalDiscount + shippingCost + tax;

    // Validate amount if provided (prevent frontend tampering)
    if (amount !== undefined) {
      const amountDiff = Math.abs(amount - calculatedTotal);
      if (amountDiff > 0.01) { // Allow 1 cent tolerance for rounding
        logger.warn('Amount mismatch detected', {
          frontendAmount: amount,
          calculatedAmount: calculatedTotal,
          difference: amountDiff,
          userId,
          sessionId,
        });
        return res.status(400).json({
          error: 'Order amount validation failed. Please refresh and try again.',
          errorCode: 'AMOUNT_MISMATCH',
          details: 'The order total has changed. Please refresh the page.',
        });
      }
    }

    // Create PaymentIntent with Stripe
    // 检查 Stripe 配置
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.trim() === '') {
      logger.error('Stripe Secret Key is missing!');
      return res.status(500).json({ error: 'Stripe is not configured', details: 'Please configure STRIPE_SECRET_KEY in environment variables' });
    }

    // 延迟初始化 Stripe 客户端
    const stripe = getStripe();

    // Generate idempotency key for safe retries
    const idempotencyKey = `${userId || sessionId || 'guest'}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Build metadata
    const paymentMetadata = {
      userId: userId || '',
      sessionId: sessionId || '',
      itemCount: cart.items.length.toString(),
      ...(draftOrderId ? { draftOrderId } : {}),
      ...(couponResult.coupon ? { couponCode: couponResult.coupon.code, couponId: couponResult.coupon.id } : {}),
      ...(promotionResult.promotions && promotionResult.promotions.length > 0
        ? { promotionIds: promotionResult.promotions.map((p) => p.promotionId).join(',') }
        : {}),
      ...additionalMetadata, // Allow additional metadata
    };

    logger.info('Creating PaymentIntent with:', {
      amount: Math.round(calculatedTotal * 100),
      currency: currency.toLowerCase(),
      idempotencyKey,
      metadata: paymentMetadata,
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(calculatedTotal * 100), // Convert to cents
      currency: currency.toLowerCase(),
      capture_method: 'automatic', // Automatic capture
      metadata: paymentMetadata,
      receipt_email: customerEmail || shippingAddress.email, // Receipt email
    }, {
      idempotencyKey, // Prevent duplicate payment intents
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: calculatedTotal,
      currency: currency.toUpperCase(),
      breakdown: {
        subtotal: Math.round(subtotal * 100) / 100,
        promotionDiscount: Math.round(promotionDiscount * 100) / 100, // 促销折扣
        discount: Math.round(totalDiscount * 100) / 100, // 总折扣（促销+优惠券）
        shipping: Math.round(shippingCost * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        total: Math.round(calculatedTotal * 100) / 100,
      }, // 返回费用明细供前端展示
      ...(promotionResult.promotions && promotionResult.promotions.length > 0
        ? { promotions: promotionResult.promotions }
        : {}), // 返回促销活动信息
      ...(couponResult.coupon ? { coupon: couponResult.coupon } : {}), // 返回优惠券信息
    });
  } catch (error) {
    // 改进错误处理和日志记录
    // Enhanced error handling with error codes
    logger.error('Error creating payment intent:', {
      error: error.message,
      stack: error.stack,
      stripeError: error.raw || error.type || null,
      userId,
      sessionId,
    });

    // 如果是 Stripe 配置错误，返回更明确的错误信息
    if (error.message.includes('STRIPE_SECRET_KEY is not configured')) {
      return res.status(500).json({
        error: 'Stripe is not configured',
        errorCode: 'STRIPE_NOT_CONFIGURED',
        details: 'Please configure STRIPE_SECRET_KEY in environment variables'
      });
    }

    // 如果是 Stripe API 错误，返回更详细的错误信息
    if (error.type && error.raw) {
      return res.status(500).json({
        error: 'Failed to create payment intent',
        errorCode: 'STRIPE_API_ERROR',
        details: error.message,
        stripeError: error.type,
      });
    }

    // 网络错误
    if (error.message.includes('network') || error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
      return res.status(503).json({
        error: 'Network error. Please try again later.',
        errorCode: 'NETWORK_ERROR',
        details: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to create payment intent',
      errorCode: 'INTERNAL_ERROR',
      details: error.message
    });
  }
};

/**
 * POST /api/checkout/confirm - Confirm order after payment
 */
const splitFullName = (fullName = '') => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}; // 工具函数：拆分全名以持久化地址

async function upsertUserAddress(prismaClient, userId, address, options = {}) {
  if (!address?.addressLine1) {
    return null;
  }

  const { isDefault = false } = options;
  const { firstName, lastName } = splitFullName(address.fullName);

  const existing = await prismaClient.address.findFirst({
    where: {
      userId,
      address1: address.addressLine1,
      postalCode: address.postalCode,
    },
  });

  const payload = {
    firstName: firstName || address.fullName || 'Customer',
    lastName,
    company: null,
    address1: address.addressLine1,
    address2: address.addressLine2 || null,
    city: address.city,
    province: address.province,
    postalCode: address.postalCode,
    country: (address.country || 'CA').toUpperCase(),
    phone: address.phone || null,
    isDefault,
  };

  if (existing) {
    return prismaClient.address.update({
      where: { id: existing.id },
      data: payload,
    });
  }

  return prismaClient.address.create({
    data: {
      userId,
      ...payload,
    },
  });
} // 登录用户下单后同步地址簿

exports.confirmOrder = async (req, res) => {
  try {
    const { paymentIntentId, shippingAddress, billingAddress, shippingMethod = 'standard', couponCode, couponId } = req.body; // 支持优惠券代码和ID
    const userId = req.user?.id || null;
    const sessionId = req.sessionId || null;
    const email = req.body.email || req.user?.email;

    const shippingSettings = await getSettingValue('site.shipping', DEFAULT_SHIPPING_SETTINGS);

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'paymentIntentId is required' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!shippingAddress) {
      return res.status(400).json({ error: 'Shipping address is required' });
    }

    // Verify PaymentIntent with Stripe
    // 检查 Stripe 配置并使用延迟初始化
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.trim() === '') {
      logger.error('Stripe Secret Key is missing in confirmOrder!');
      return res.status(500).json({ error: 'Stripe is not configured', details: 'Please configure STRIPE_SECRET_KEY in environment variables' });
    }

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        error: 'Payment not completed',
        status: paymentIntent.status,
      });
    }

    // Get cart
    const cart = await getOrCreateCart(userId, sessionId);

    if (cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Check stock availability before creating order
    const stockCheck = await checkMultipleStockAvailability(
      cart.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      }))
    );

    if (!stockCheck.allSufficient) {
      const insufficientItems = stockCheck.insufficient.map((check) => ({
        variantId: check.variant.id,
        sku: check.variant.sku,
        productName: check.variant.productName,
        requested: check.requested,
        available: check.available,
      }));

      return res.status(400).json({
        error: 'Insufficient stock',
        details: insufficientItems,
        message: 'Some items in your cart are out of stock or have insufficient quantity',
      });
    }

    // Calculate totals
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + Number(item.priceSnapshot) * item.quantity;
    }, 0);

    // Calculate promotion discount
    const promotionResult = await calculatePromotionDiscount(cart.items, subtotal);
    const promotionDiscount = promotionResult.discount || 0;
    const subtotalAfterPromotion = subtotal - promotionDiscount;

    // Validate coupon and calculate discount (on subtotal after promotion)
    // Use couponId if provided, otherwise use couponCode
    let couponResult = { discount: 0, coupon: null, error: null };
    if (couponId) {
      // If couponId is provided, fetch the coupon and validate
      const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
      if (coupon) {
        couponResult = await validateCouponAndCalculateDiscount(coupon.code, subtotalAfterPromotion, userId);
      }
    } else if (couponCode) {
      couponResult = await validateCouponAndCalculateDiscount(couponCode, subtotalAfterPromotion, userId);
    }

    if (couponResult.error) {
      return res.status(400).json({ error: couponResult.error });
    }

    const couponDiscount = couponResult.discount || 0;
    const totalDiscount = promotionDiscount + couponDiscount; // 总折扣
    const shippingCost = calculateShipping(shippingAddress.country, shippingAddress.province, shippingMethod, shippingSettings);
    // Tax is calculated on subtotal minus all discounts
    const tax = calculateTax(subtotalAfterPromotion - couponDiscount, shippingAddress.province);
    const total = subtotal - totalDiscount + shippingCost + tax;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create order and apply coupon in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: userId || null,
          email,
          status: 'PENDING',
          currency: 'CAD',
          subtotal: subtotal,
          shippingCost: shippingCost,
          tax: tax,
          discount: totalDiscount, // 使用总折扣金额（促销+优惠券）
          total: total,
          paymentStatus: 'COMPLETED',
          paymentIntentId: paymentIntentId,
          shippingAddress: {
            ...shippingAddress,
            shippingMethod,
          },
          billingAddress: billingAddress || shippingAddress,
          items: {
            create: cart.items.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              priceSnapshot: item.priceSnapshot,
            })),
          },
          // Create OrderPromotion records if promotions were applied
          ...(promotionResult.promotions && promotionResult.promotions.length > 0
            ? {
              orderPromotions: {
                create: promotionResult.promotions.map((promo) => ({
                  promotionId: promo.promotionId,
                  discountAmount: promo.discountAmount,
                })),
              },
            }
            : {}),
          // Create OrderCoupon record if coupon was applied
          ...(couponResult.coupon
            ? {
              orderCoupons: {
                create: {
                  couponId: couponResult.coupon.id,
                  userId: userId || null,
                  discountAmount: couponDiscount, // 只记录优惠券折扣
                },
              },
            }
            : {}),
        },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });

      // Decrease inventory for all order items
      // Use correct Prisma model name: Variant (not productVariant)
      // This is done within the transaction to ensure atomicity
      for (const item of createdOrder.items) {
        await tx.variant.update({
          where: { id: item.variantId },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      logger.info('Inventory decreased for order', {
        orderId: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        itemsProcessed: createdOrder.items.length,
      });

      // Update coupon used count if coupon was applied
      if (couponResult.coupon) {
        await tx.coupon.update({
          where: { id: couponResult.coupon.id },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });
        logger.info('Coupon used count updated', {
          couponId: couponResult.coupon.id,
          couponCode: couponResult.coupon.code,
          orderId: createdOrder.id,
        });
      }

      if (userId) {
        // 保存用户常用地址
        await upsertUserAddress(tx, userId, shippingAddress, { isDefault: true });
        if (
          billingAddress &&
          (billingAddress.addressLine1 !== shippingAddress.addressLine1 ||
            billingAddress.postalCode !== shippingAddress.postalCode)
        ) {
          await upsertUserAddress(tx, userId, billingAddress, { isDefault: false });
        }
      }

      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return createdOrder;
    });

    logger.info('Order confirmed', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      email: order.email,
      total: Number(order.total),
      paymentIntentId,
    });

    // Send order confirmation email (webhook will also send, but this ensures delivery)
    // Don't fail the response if email fails
    try {
      await sendOrderConfirmation(order);
    } catch (emailError) {
      logger.warn('Failed to send order confirmation email during order creation', {
        orderNumber: order.orderNumber,
        error: emailError.message,
      });
      // Email will be sent by webhook as backup
    }

    res.status(201).json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status.toLowerCase(),
      total: Number(order.total),
      email: order.email,
    });
  } catch (error) {
    logger.error('Error confirming order:', {
      error: error.message,
      stack: error.stack,
      paymentIntentId: req.body.paymentIntentId,
    });
    res.status(500).json({
      error: 'Failed to confirm order',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
