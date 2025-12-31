/**
 * Chat Controller
* Issue #144 - Customer service chat API
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

/**
 * GET /api/chat/rooms - Get user's chat rooms
 */
exports.getRooms = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const sessionId = req.sessionId || null;
    const isAgent = req.user?.role === 'ADMIN' || req.user?.role === 'SALES' || req.user?.role === 'SALES_MANAGER';

    let rooms;

    if (isAgent) {
      // Agents can see all rooms
      const { status, limit = 50, offset = 0 } = req.query;
      const where = {};
      if (status) {
        where.status = status;
      }

      rooms = await prisma.chatRoom.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          agent: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
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
          },
          _count: {
            select: {
              messages: {
                where: {
                  isRead: false,
                  senderType: 'CUSTOMER',
                },
              },
            },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      });
    } else if (userId) {
      // Logged-in customers see their own rooms
      rooms = await prisma.chatRoom.findMany({
        where: { customerId: userId },
        include: {
          agent: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              messages: {
                where: {
                  isRead: false,
                  senderType: 'AGENT',
                },
              },
            },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      });
    } else if (sessionId) {
      // Guest users see rooms by session ID
      rooms = await prisma.chatRoom.findMany({
        where: { sessionId },
        include: {
          agent: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              messages: {
                where: {
                  isRead: false,
                  senderType: 'AGENT',
                },
              },
            },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      });
    } else {
      return res.json({ rooms: [] });
    }

    res.json({
      rooms: rooms.map((room) => ({
        id: room.id,
        status: room.status,
        customer: room.customer
          ? {
              id: room.customer.id,
              email: room.customer.email,
              name: `${room.customer.firstName || ''} ${room.customer.lastName || ''}`.trim() || room.customer.email,
            }
          : {
              name: room.customerName || 'Guest',
              email: room.customerEmail,
            },
        agent: room.agent
          ? {
              id: room.agent.id,
              email: room.agent.email,
              name: `${room.agent.firstName || ''} ${room.agent.lastName || ''}`.trim() || room.agent.email,
            }
          : null,
        lastMessage: room.messages[0]
          ? {
              id: room.messages[0].id,
              content: room.messages[0].content,
              senderType: room.messages[0].senderType,
              createdAt: room.messages[0].createdAt.toISOString(),
            }
          : null,
        unreadCount: room._count.messages,
        lastMessageAt: room.lastMessageAt?.toISOString() || null,
        createdAt: room.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error('[chatController] getRooms error:', error);
    res.status(500).json({ error: 'Failed to load chat rooms' });
  }
};

/**
 * POST /api/chat/rooms - Create a new chat room
 */
exports.createRoom = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const sessionId = req.sessionId || null;
    const { customerName, customerEmail } = req.body || {};

    // Validate that user or session exists
    if (!userId && !sessionId) {
      return res.status(400).json({ error: 'User or session required' });
    }

    // For guest users, require name and email
    if (!userId && (!customerName || !customerEmail)) {
      return res.status(400).json({ error: 'Customer name and email are required for guest users' });
    }

    // Check if user already has an open room
    const existingRoom = await prisma.chatRoom.findFirst({
      where: {
        OR: [
          userId ? { customerId: userId, status: { in: ['OPEN', 'ASSIGNED', 'ACTIVE'] } } : {},
          sessionId ? { sessionId, status: { in: ['OPEN', 'ASSIGNED', 'ACTIVE'] } } : {},
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingRoom) {
      return res.json({
        room: {
          id: existingRoom.id,
          status: existingRoom.status,
          createdAt: existingRoom.createdAt.toISOString(),
        },
      });
    }

    // Create new room
    const room = await prisma.chatRoom.create({
      data: {
        customerId: userId || null,
        sessionId: sessionId || null,
        customerName: !userId ? customerName : null,
        customerEmail: !userId ? customerEmail : null,
        status: 'OPEN',
      },
      include: {
        customer: userId
          ? {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            }
          : false,
      },
    });

    res.status(201).json({
      room: {
        id: room.id,
        status: room.status,
        customer: room.customer
          ? {
              id: room.customer.id,
              email: room.customer.email,
              name: `${room.customer.firstName || ''} ${room.customer.lastName || ''}`.trim() || room.customer.email,
            }
          : {
              name: room.customerName || 'Guest',
              email: room.customerEmail,
            },
        createdAt: room.createdAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error('[chatController] createRoom error:', error);
    res.status(500).json({ error: 'Failed to create chat room' });
  }
};

/**
 * GET /api/chat/rooms/:id - Get chat room details
 */
exports.getRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;
    const sessionId = req.sessionId || null;
    const isAgent = req.user?.role === 'ADMIN' || req.user?.role === 'SALES' || req.user?.role === 'SALES_MANAGER';

    const room = await prisma.chatRoom.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        agent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check access permissions
    const hasAccess =
      isAgent ||
      (userId && room.customerId === userId) ||
      (sessionId && room.sessionId === sessionId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      room: {
        id: room.id,
        status: room.status,
        customer: room.customer
          ? {
              id: room.customer.id,
              email: room.customer.email,
              name: `${room.customer.firstName || ''} ${room.customer.lastName || ''}`.trim() || room.customer.email,
            }
          : {
              name: room.customerName || 'Guest',
              email: room.customerEmail,
            },
        agent: room.agent
          ? {
              id: room.agent.id,
              email: room.agent.email,
              name: `${room.agent.firstName || ''} ${room.agent.lastName || ''}`.trim() || room.agent.email,
            }
          : null,
        lastMessageAt: room.lastMessageAt?.toISOString() || null,
        createdAt: room.createdAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error('[chatController] getRoom error:', error);
    res.status(500).json({ error: 'Failed to load chat room' });
  }
};

/**
 * GET /api/chat/rooms/:id/messages - Get messages in a room
 */
exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.user?.id || null;
    const sessionId = req.sessionId || null;
    const isAgent = req.user?.role === 'ADMIN' || req.user?.role === 'SALES' || req.user?.role === 'SALES_MANAGER';

    // Verify room access
    const room = await prisma.chatRoom.findUnique({
      where: { id },
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const hasAccess =
      isAgent ||
      (userId && room.customerId === userId) ||
      (sessionId && room.sessionId === sessionId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { roomId: id },
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
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    res.json({
      messages: messages
        .reverse()
        .map((msg) => ({
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
  } catch (error) {
    logger.error('[chatController] getMessages error:', error);
    res.status(500).json({ error: 'Failed to load messages' });
  }
};

/**
 * PATCH /api/chat/rooms/:id/assign - Assign agent to room (agent only)
 */
exports.assignAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body || {};
    const userId = req.user?.id;

    // Verify user is an agent
    const isAgent = req.user?.role === 'ADMIN' || req.user?.role === 'SALES' || req.user?.role === 'SALES_MANAGER';
    if (!isAgent) {
      return res.status(403).json({ error: 'Only agents can assign rooms' });
    }

    const targetAgentId = agentId || userId;

    const room = await prisma.chatRoom.update({
      where: { id },
      data: {
        agentId: targetAgentId,
        status: 'ASSIGNED',
      },
      include: {
        agent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json({
      room: {
        id: room.id,
        status: room.status,
        agent: room.agent
          ? {
              id: room.agent.id,
              email: room.agent.email,
              name: `${room.agent.firstName || ''} ${room.agent.lastName || ''}`.trim() || room.agent.email,
            }
          : null,
      },
    });
  } catch (error) {
    logger.error('[chatController] assignAgent error:', error);
    res.status(500).json({ error: 'Failed to assign agent' });
  }
};

/**
 * PATCH /api/chat/rooms/:id/status - Update room status
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const userId = req.user?.id;
    const isAgent = req.user?.role === 'ADMIN' || req.user?.role === 'SALES' || req.user?.role === 'SALES_MANAGER';

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Verify access
    const room = await prisma.chatRoom.findUnique({
      where: { id },
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Only agents can change status, or customers can close their own rooms
    if (!isAgent && (status !== 'CLOSED' || room.customerId !== userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedRoom = await prisma.chatRoom.update({
      where: { id },
      data: { status },
    });

    res.json({
      room: {
        id: updatedRoom.id,
        status: updatedRoom.status,
      },
    });
  } catch (error) {
    logger.error('[chatController] updateStatus error:', error);
    res.status(500).json({ error: 'Failed to update room status' });
  }
};

