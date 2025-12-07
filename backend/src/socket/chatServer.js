/**
 * WebSocket Server for Customer Service Chat
 * [2025-12-07 01:30:00] Issue #144 - Real-time chat support
 */
const { Server } = require('socket.io');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

// [2025-12-07 01:30:00] Get JWT secret for authentication
function getJwtSecret() {
  const DEFAULT_JWT_SECRET = 'your_jwt_secret_key_change_in_production';
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === DEFAULT_JWT_SECRET) {
    logger.warn('[ChatServer] Using default JWT_SECRET - not recommended for production');
  }
  return secret || DEFAULT_JWT_SECRET;
}

/**
 * Initialize Socket.IO server
 */
function initializeChatServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_API_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
  });

  // [2025-12-07 01:30:00] Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      const sessionId = socket.handshake.auth.sessionId;
      const userType = socket.handshake.auth.userType || 'customer'; // 'customer' or 'agent'

      if (!token && !sessionId) {
        return next(new Error('Authentication required'));
      }

      let user = null;
      let userId = null;

      // Try to authenticate with JWT token
      if (token) {
        try {
          const jwtSecret = getJwtSecret();
          const decoded = jwt.verify(token, jwtSecret);
          userId = decoded.userId || decoded.id;

          if (userId) {
            user = await prisma.user.findUnique({
              where: { id: userId },
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            });

            // [2025-12-07 01:30:00] Verify agent role if connecting as agent
            if (userType === 'agent' && user.role !== 'ADMIN' && user.role !== 'SALES' && user.role !== 'SALES_MANAGER') {
              return next(new Error('Insufficient permissions for agent access'));
            }
          }
        } catch (jwtError) {
          // Invalid token, continue as guest if sessionId is provided
          if (!sessionId) {
            return next(new Error('Invalid token'));
          }
        }
      }

      // Attach user info to socket
      socket.userId = userId;
      socket.user = user;
      socket.sessionId = sessionId;
      socket.userType = userType;

      next();
    } catch (error) {
      logger.error('[ChatServer] Authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // [2025-12-07 01:30:00] Handle client connections
  io.on('connection', async (socket) => {
    logger.info('[ChatServer] Client connected', {
      socketId: socket.id,
      userId: socket.userId,
      userType: socket.userType,
      hasSession: !!socket.sessionId,
    });

    // [2025-12-07 01:30:00] Join user's room for notifications
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }
    if (socket.sessionId) {
      socket.join(`session:${socket.sessionId}`);
    }

    // [2025-12-07 01:30:00] Join agent room if user is an agent
    if (socket.userType === 'agent' && socket.user) {
      socket.join('agents');
      // Notify other agents that a new agent is online
      socket.to('agents').emit('agent:online', {
        agentId: socket.userId,
        agentName: `${socket.user.firstName || ''} ${socket.user.lastName || ''}`.trim() || socket.user.email,
      });
    }

    // [2025-12-07 01:30:00] Handle joining a chat room
    socket.on('room:join', async (data) => {
      try {
        const { roomId } = data;

        if (!roomId) {
          return socket.emit('error', { message: 'Room ID is required' });
        }

        // Verify user has access to this room
        const room = await prisma.chatRoom.findUnique({
          where: { id: roomId },
        });

        if (!room) {
          return socket.emit('error', { message: 'Room not found' });
        }

        // Check access permissions
        const hasAccess =
          (socket.userId && (room.customerId === socket.userId || room.agentId === socket.userId)) ||
          (socket.sessionId && room.sessionId === socket.sessionId) ||
          (socket.userType === 'agent' && socket.user);

        if (!hasAccess) {
          return socket.emit('error', { message: 'Access denied' });
        }

        socket.join(`room:${roomId}`);
        socket.currentRoomId = roomId;

        // Send room history
        const messages = await prisma.chatMessage.findMany({
          where: { roomId },
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
          take: 100, // Last 100 messages
        });

        socket.emit('room:history', {
          roomId,
          messages: messages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            senderType: msg.senderType,
            sender: msg.sender
              ? {
                  id: msg.sender.id,
                  name: `${msg.sender.firstName || ''} ${msg.sender.lastName || ''}`.trim() || msg.sender.email,
                }
              : null,
            createdAt: msg.createdAt.toISOString(),
            isRead: msg.isRead,
          })),
        });

        logger.info('[ChatServer] User joined room', {
          socketId: socket.id,
          roomId,
          userId: socket.userId,
        });
      } catch (error) {
        logger.error('[ChatServer] Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // [2025-12-07 01:30:00] Handle sending a message
    socket.on('message:send', async (data) => {
      try {
        const { roomId, content } = data;

        if (!roomId || !content || !content.trim()) {
          return socket.emit('error', { message: 'Room ID and content are required' });
        }

        // Verify room access
        const room = await prisma.chatRoom.findUnique({
          where: { id: roomId },
        });

        if (!room) {
          return socket.emit('error', { message: 'Room not found' });
        }

        // Determine sender type
        let senderType = 'CUSTOMER';
        if (socket.userType === 'agent') {
          senderType = 'AGENT';
        }

        // Create message
        const message = await prisma.chatMessage.create({
          data: {
            roomId,
            senderId: socket.userId,
            senderType,
            content: content.trim(),
          },
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        // Update room's last message time
        await prisma.chatRoom.update({
          where: { id: roomId },
          data: {
            lastMessageAt: new Date(),
            status: room.status === 'OPEN' ? 'ACTIVE' : room.status,
            // Auto-assign agent if this is the first message from customer
            agentId: !room.agentId && socket.userType === 'agent' ? socket.userId : room.agentId,
          },
        });

        // Broadcast message to all users in the room
        const messageData = {
          id: message.id,
          roomId: message.roomId,
          content: message.content,
          senderType: message.senderType,
          sender: message.sender
            ? {
                id: message.sender.id,
                name: `${message.sender.firstName || ''} ${message.sender.lastName || ''}`.trim() || message.sender.email,
              }
            : null,
          createdAt: message.createdAt.toISOString(),
          isRead: message.isRead,
        };

        io.to(`room:${roomId}`).emit('message:new', messageData);

        // Notify other agents if customer sent a message
        if (senderType === 'CUSTOMER') {
          io.to('agents').emit('room:new-message', {
            roomId,
            message: messageData,
          });
        }

        logger.info('[ChatServer] Message sent', {
          socketId: socket.id,
          roomId,
          messageId: message.id,
          senderType,
        });
      } catch (error) {
        logger.error('[ChatServer] Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // [2025-12-07 01:30:00] Handle marking messages as read
    socket.on('message:read', async (data) => {
      try {
        const { roomId, messageIds } = data;

        if (!roomId) {
          return socket.emit('error', { message: 'Room ID is required' });
        }

        // Mark messages as read
        if (messageIds && messageIds.length > 0) {
          await prisma.chatMessage.updateMany({
            where: {
              id: { in: messageIds },
              roomId,
              isRead: false,
            },
            data: {
              isRead: true,
              readAt: new Date(),
            },
          });
        } else {
          // Mark all unread messages in room as read
          await prisma.chatMessage.updateMany({
            where: {
              roomId,
              isRead: false,
              senderType: socket.userType === 'agent' ? 'CUSTOMER' : 'AGENT',
            },
            data: {
              isRead: true,
              readAt: new Date(),
            },
          });
        }

        // Notify other users in the room
        socket.to(`room:${roomId}`).emit('message:read-update', {
          roomId,
          messageIds: messageIds || [],
        });
      } catch (error) {
        logger.error('[ChatServer] Error marking messages as read:', error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    // [2025-12-07 01:30:00] Handle disconnection
    socket.on('disconnect', () => {
      logger.info('[ChatServer] Client disconnected', {
        socketId: socket.id,
        userId: socket.userId,
        userType: socket.userType,
      });

      // Notify agents if an agent disconnected
      if (socket.userType === 'agent' && socket.userId) {
        socket.to('agents').emit('agent:offline', {
          agentId: socket.userId,
        });
      }
    });
  });

  return io;
}

module.exports = { initializeChatServer };

