/**
 * Chat Routes
 * [2025-12-07 01:30:00] Issue #144 - Customer service chat API routes
 */
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate, authenticateOptional } = require('../middleware/auth');

// [2025-12-07 01:30:00] Get user's chat rooms (supports both authenticated and guest users)
router.get('/rooms', authenticateOptional, chatController.getRooms);

// [2025-12-07 01:30:00] Create a new chat room
router.post('/rooms', authenticateOptional, chatController.createRoom);

// [2025-12-07 01:30:00] Get chat room details
router.get('/rooms/:id', authenticateOptional, chatController.getRoom);

// [2025-12-07 01:30:00] Get messages in a room
router.get('/rooms/:id/messages', authenticateOptional, chatController.getMessages);

// [2025-12-07 01:30:00] Assign agent to room (agent only)
router.patch('/rooms/:id/assign', authenticate, chatController.assignAgent);

// [2025-12-07 01:30:00] Update room status
router.patch('/rooms/:id/status', authenticateOptional, chatController.updateStatus);

module.exports = router;

