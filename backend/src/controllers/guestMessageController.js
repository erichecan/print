/**
 * Guest Message Controller
 * [2025-12-10 00:00:00] 留言本控制器 - 处理 help center 留言
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { sendContactFormNotification } = require('../services/emailService');
const { BadRequestError, NotFoundError, InternalServerError } = require('../utils/errors');

/**
 * POST /api/guest-messages
 * Create a new guest message
 * [2025-12-10 00:00:00] 创建新留言
 */
exports.createGuestMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message, orderNumber } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: {
          name: !name ? 'Name is required' : undefined,
          email: !email ? 'Email is required' : undefined,
          message: !message ? 'Message is required' : undefined,
        },
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email address',
      });
    }

    // Create guest message in database
    const guestMessage = await prisma.guestMessage.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject: subject || null,
        message,
        orderNumber: orderNumber || null,
        status: 'UNREAD',
      },
    });

    // Send notification email to support team (optional, don't fail if email fails)
    try {
      await sendContactFormNotification({
        name,
        email,
        phone,
        subject: subject || 'Guest Message from Help Center',
        message,
        orderNumber,
      });
      logger.info('Guest message notification email sent', {
        messageId: guestMessage.id,
        email,
      });
    } catch (emailError) {
      logger.warn('Failed to send guest message notification email', {
        messageId: guestMessage.id,
        error: emailError.message,
      });
      // Don't throw - email failure shouldn't fail message creation
    }

    logger.info('Guest message created', {
      messageId: guestMessage.id,
      email,
      name,
    });

    res.status(201).json({
      id: guestMessage.id,
      message: 'Message submitted successfully',
    });
  } catch (error) {
    logger.error('Failed to create guest message', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Failed to submit message',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET /api/admin/guest-messages
 * List all guest messages (admin only)
 * [2025-12-10 00:00:00] 获取所有留言（管理员）
 */
exports.listGuestMessages = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (status && ['UNREAD', 'READ', 'ARCHIVED'].includes(status)) {
      where.status = status;
    }

    const [messages, total] = await Promise.all([
      prisma.guestMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        include: {
          readByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.guestMessage.count({ where }),
    ]);

    res.json({
      data: messages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Failed to list guest messages', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Failed to fetch messages',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET /api/admin/guest-messages/:id
 * Get a single guest message (admin only)
 * [2025-12-10 00:00:00] 获取单个留言（管理员）
 */
exports.getGuestMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await prisma.guestMessage.findUnique({
      where: { id },
      include: {
        readByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!message) {
      return res.status(404).json({
        error: 'Message not found',
      });
    }

    res.json(message);
  } catch (error) {
    logger.error('Failed to get guest message', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Failed to fetch message',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * PATCH /api/admin/guest-messages/:id/status
 * Update guest message status (admin only)
 * [2025-12-10 00:00:00] 更新留言状态（管理员）
 */
exports.updateGuestMessageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['UNREAD', 'READ', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be UNREAD, READ, or ARCHIVED',
      });
    }

    const updateData = {
      status,
    };

    // If marking as read, set readAt and readBy
    if (status === 'READ' && req.user?.id) {
      updateData.readAt = new Date();
      updateData.readBy = req.user.id;
    }

    const message = await prisma.guestMessage.update({
      where: { id },
      data: updateData,
      include: {
        readByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info('Guest message status updated', {
      messageId: id,
      status,
      updatedBy: req.user?.id,
    });

    res.json(message);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Message not found',
      });
    }
    logger.error('Failed to update guest message status', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Failed to update message status',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * DELETE /api/admin/guest-messages/:id
 * Delete a guest message (admin only)
 * [2025-12-10 00:00:00] 删除留言（管理员）
 */
exports.deleteGuestMessage = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.guestMessage.delete({
      where: { id },
    });

    logger.info('Guest message deleted', {
      messageId: id,
      deletedBy: req.user?.id,
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Message not found',
      });
    }
    logger.error('Failed to delete guest message', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Failed to delete message',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

