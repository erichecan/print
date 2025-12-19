/**
 * Guest Messages Routes
 * [2025-12-10 00:00:00] 留言本路由
 * [2025-12-18 23:15:00] 修复：使用 requireAdmin 而不是 authenticateAdmin
 */
const express = require('express');
const router = express.Router();
const guestMessageController = require('../controllers/guestMessageController');
const { requireAdmin } = require('../middleware/auth');

// Public route - anyone can submit a message
// [2025-12-19 01:55:00] 修复：使用完整路径 /guest-messages 以匹配 /api/guest-messages（之前使用 '/' 导致 404）
router.post('/guest-messages', guestMessageController.createGuestMessage);

// Admin routes - require authentication
// [2025-12-18 23:15:00] 修复：使用 requireAdmin 中间件
router.get('/admin/guest-messages', requireAdmin, guestMessageController.listGuestMessages);
router.get('/admin/guest-messages/:id', requireAdmin, guestMessageController.getGuestMessage);
router.patch('/admin/guest-messages/:id/status', requireAdmin, guestMessageController.updateGuestMessageStatus);
router.delete('/admin/guest-messages/:id', requireAdmin, guestMessageController.deleteGuestMessage);

module.exports = router;

