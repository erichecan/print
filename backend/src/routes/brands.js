/**
 * Brands Routes (Public API)
* 品牌相关 API 路由
 */
const express = require('express');
const brandController = require('../controllers/brandController');

const router = express.Router();

// 获取指定品牌的产品列表（排除当前商品）
router.get('/:id/products', brandController.getBrandProducts);

module.exports = router;
