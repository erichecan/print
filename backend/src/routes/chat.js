/**
 * Chat Routes
* Issue #144 - Customer service chat API routes
 */
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate, authenticateOptional } = require('../middleware/auth');

// Get user's chat rooms (supports both authenticated and guest users)
router.get('/rooms', authenticateOptional, chatController.getRooms);

// Create a new chat room
router.post('/rooms', authenticateOptional, chatController.createRoom);

// Get chat room details
router.get('/rooms/:id', authenticateOptional, chatController.getRoom);

// Get messages in a room
router.get('/rooms/:id/messages', authenticateOptional, chatController.getMessages);

// Assign agent to room (agent only)
router.patch('/rooms/:id/assign', authenticate, chatController.assignAgent);

// Update room status
router.patch('/rooms/:id/status', authenticateOptional, chatController.updateStatus);

module.exports = router;

