// 结账路由绑定真实控制器 [2025-11-10 14:08:00]
const express = require('express');
const checkoutController = require('../controllers/checkoutController');
const { authenticateOptional } = require('../middleware/auth');

const router = express.Router();

// [2025-11-10 14:08:00] 结账准备
router.post('/prepare', authenticateOptional, checkoutController.prepareCheckout);

// [2025-11-10 14:08:00] 计算运费
router.post('/shipping-rates', authenticateOptional, checkoutController.getShippingRates);

// [2025-11-10 14:08:00] 创建支付意图
router.post('/create-payment-intent', authenticateOptional, checkoutController.createPaymentIntent);

// [2025-11-10 14:08:00] 支付后确认订单
router.post('/confirm', authenticateOptional, checkoutController.confirmOrder);

module.exports = router;
