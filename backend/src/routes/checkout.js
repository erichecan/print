// 结账路由绑定真实控制器 
const express = require('express');
const checkoutController = require('../controllers/checkoutController');
const { authenticateOptional } = require('../middleware/auth');

const router = express.Router();

// 结账准备
router.post('/prepare', authenticateOptional, checkoutController.prepareCheckout);

// 计算运费
router.post('/shipping-rates', authenticateOptional, checkoutController.getShippingRates);

// 创建支付意图
router.post('/create-payment-intent', authenticateOptional, checkoutController.createPaymentIntent);

// 支付后确认订单
router.post('/confirm', authenticateOptional, checkoutController.confirmOrder);

// DEV ONLY: bypass payment, create order directly (blocked in production by controller)
router.post('/dev-order', authenticateOptional, checkoutController.devBypassOrder);

module.exports = router;
