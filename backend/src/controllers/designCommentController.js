/**
 * Design Comment Controller
* 设计评论管理
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

// GET /api/designs/:id/comments - 获取设计评论
exports.getComments = async (req, res) => {
  try {
    const { id: designId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const comments = await prisma.designComment.findMany({
      where: {
        designId,
        isApproved: true,
        parentId: null, // 只获取顶级评论
      },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
      orderBy: { createdAt: 'desc' },
      include: {
        replies: {
          where: { isApproved: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    
    res.json({
      data: comments,
      pagination: {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      },
    });
  } catch (error) {
    logger.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

// POST /api/designs/:id/comments - 提交评论
exports.createComment = async (req, res) => {
  try {
    const { id: designId } = req.params;
    const { content, parentId, authorName, authorEmail } = req.body;
    const userId = req.user?.id || null;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    // 验证设计是否存在
    const design = await prisma.design.findUnique({
      where: { id: designId },
    });
    
    if (!design) {
      return res.status(404).json({ error: 'Design not found' });
    }
    
    // 如果有 parentId，验证父评论存在
    if (parentId) {
      const parent = await prisma.designComment.findUnique({
        where: { id: parentId },
      });
      
      if (!parent || parent.designId !== designId) {
        return res.status(400).json({ error: 'Invalid parent comment' });
      }
    }
    
    const comment = await prisma.designComment.create({
      data: {
        designId,
        userId,
        parentId: parentId || null,
        content: content.trim(),
        authorName: userId ? null : (authorName || 'Anonymous'),
        authorEmail: userId ? null : authorEmail,
        isApproved: true, // 可以改为 false 需要审核
      },
      include: {
        replies: [],
      },
    });
    
    res.status(201).json({ data: comment });
  } catch (error) {
    logger.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

// POST /api/comments/:id/like - 点赞评论
exports.likeComment = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.designComment.update({
      where: { id },
      data: { likesCount: { increment: 1 } },
    });
    
    res.json({ message: 'Comment liked successfully' });
  } catch (error) {
    logger.error('Error liking comment:', error);
    res.status(500).json({ error: 'Failed to like comment' });
  }
};

