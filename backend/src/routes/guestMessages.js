/**
 * Guest Messages Routes
 * [2025-12-10 00:00:00] 留言本路由
 */
const express = require('express');
const router = express.Router();
const guestMessageController = require('../controllers/guestMessageController');
const { authenticateAdmin } = require('../middleware/auth');

// Public route - anyone can submit a message
router.post('/', guestMessageController.createGuestMessage);

// Admin routes - require authentication
router.get('/admin/guest-messages', authenticateAdmin, guestMessageController.listGuestMessages);
router.get('/admin/guest-messages/:id', authenticateAdmin, guestMessageController.getGuestMessage);
router.patch('/admin/guest-messages/:id/status', authenticateAdmin, guestMessageController.updateGuestMessageStatus);
router.delete('/admin/guest-messages/:id', authenticateAdmin, guestMessageController.deleteGuestMessage);

module.exports = router;

