/**
 * Design Lab Analytics Controller
 * [2025-12-08] 处理Design Lab埋点事件和指标收集
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * 接收埋点事件
 * POST /api/design-lab/analytics/events
 */
exports.trackEvents = async (req, res, next) => {
  try {
    const { events } = req.body;
    const userId = req.user?.id || null;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Events must be a non-empty array',
      });
    }

    // 批量保存事件到数据库
    const eventsToSave = events.map(event => ({
      id: uuidv4(),
      user_id: userId || null,
      session_id: event.sessionId,
      event_type: event.type,
      design_id: event.designId || null,
      metadata: event.metadata || {},
      timestamp: new Date(event.timestamp || new Date()),
      created_at: new Date(),
    }));

    // 使用批量插入（如果表存在）
    try {
      // [2025-12-31] 修复：为 UUID 字段添加类型转换
      await prisma.$executeRaw`
        INSERT INTO design_lab_analytics_events (
          id, user_id, session_id, event_type, design_id, metadata, timestamp, created_at
        ) VALUES ${prisma.Prisma.join(
        eventsToSave.map(e =>
          prisma.Prisma.sql`(
              ${e.id}::uuid, 
              ${e.user_id}::uuid, 
              ${e.session_id}, 
              ${e.event_type}, 
              ${e.design_id}::uuid, 
              ${JSON.stringify(e.metadata)}::jsonb, 
              ${e.timestamp}, 
              ${e.created_at}
            )`
        )
      )}
      `;
    } catch (error) {
      // 如果表不存在，记录日志但不失败（允许渐进式开发）
      logger.warn('[DesignLabAnalytics] Analytics events table may not exist:', error.message);

      // 暂时只记录到日志
      events.forEach(event => {
        logger.info('[DesignLabAnalytics] Event tracked', {
          type: event.type,
          sessionId: event.sessionId,
          userId,
          timestamp: event.timestamp,
        });
      });
    }

    res.json({
      success: true,
      message: `Tracked ${events.length} events`,
    });
  } catch (error) {
    logger.error('[DesignLabAnalytics] Error tracking events:', error);
    next(error);
  }
};

/**
 * 提交上传体验评分
 * POST /api/design-lab/upload-rating
 */
exports.submitUploadRating = async (req, res, next) => {
  try {
    const { uploadId, rating, comment, userId: bodyUserId } = req.body;
    const userId = req.user?.id || bodyUserId || null;

    if (!uploadId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Invalid rating data. Rating must be between 1 and 5.',
      });
    }

    // 保存评分到数据库
    try {
      await prisma.design_lab_upload_ratings.create({
        data: {
          id: uuidv4(),
          user_id: userId,
          upload_id: uploadId,
          rating: parseInt(rating),
          comment: comment || null,
          created_at: new Date(),
        },
      });
    } catch (error) {
      // 如果表不存在，记录日志但不失败
      logger.warn('[DesignLabAnalytics] Upload ratings table may not exist:', error.message);

      // 暂时只记录到日志
      logger.info('[DesignLabAnalytics] Upload rating submitted', {
        uploadId,
        rating,
        userId,
        comment,
      });
    }

    res.json({
      success: true,
      message: 'Rating submitted successfully',
    });
  } catch (error) {
    logger.error('[DesignLabAnalytics] Error submitting upload rating:', error);
    next(error);
  }
};

/**
 * 获取指标数据
 * GET /api/design-lab/analytics/metrics
 */
exports.getMetrics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // 构建日期过滤器
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // 计算6个目标指标
    try {
      // 1. 设计完成率 = design_completed / design_started
      const designStarted = await prisma.design_lab_analytics_events.count({
        where: {
          event_type: 'design_started',
          ...(Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {}),
        },
      });
      const designCompleted = await prisma.design_lab_analytics_events.count({
        where: {
          event_type: 'design_completed',
          ...(Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {}),
        },
      });
      const designCompletionRate = designStarted > 0 ? (designCompleted / designStarted) * 100 : 0;

      // 2. 进入报价率 = get_price_clicked / design_completed
      const getPriceClicked = await prisma.design_lab_analytics_events.count({
        where: {
          event_type: 'get_price_clicked',
          ...(Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {}),
        },
      });
      const getPriceRate = designCompleted > 0 ? (getPriceClicked / designCompleted) * 100 : 0;

      // 3. 加车率 = add_to_cart_success / get_price_completed
      const getPriceCompleted = await prisma.design_lab_analytics_events.count({
        where: {
          event_type: 'get_price_completed',
          ...(Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {}),
        },
      });
      const addToCartSuccess = await prisma.design_lab_analytics_events.count({
        where: {
          event_type: 'add_to_cart_success',
          ...(Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {}),
        },
      });
      const addToCartRate = getPriceCompleted > 0 ? (addToCartSuccess / getPriceCompleted) * 100 : 0;

      // 4. 结账率 = checkout_completed / checkout_started
      const checkoutStarted = await prisma.design_lab_analytics_events.count({
        where: {
          event_type: 'checkout_started',
          ...(Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {}),
        },
      });
      const checkoutCompleted = await prisma.design_lab_analytics_events.count({
        where: {
          event_type: 'checkout_completed',
          ...(Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {}),
        },
      });
      const checkoutRate = checkoutStarted > 0 ? (checkoutCompleted / checkoutStarted) * 100 : 0;

      // 5. 客服触达率 = customer_service_clicked / design_lab_opened
      const designLabOpened = await prisma.design_lab_analytics_events.count({
        where: {
          event_type: 'design_lab_opened',
          ...(Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {}),
        },
      });
      const customerServiceClicked = await prisma.design_lab_analytics_events.count({
        where: {
          event_type: 'customer_service_clicked',
          ...(Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {}),
        },
      });
      const customerServiceRate = designLabOpened > 0 ? (customerServiceClicked / designLabOpened) * 100 : 0;

      // 6. 设计器交互满意度（上传体验评分）
      const uploadRatings = await prisma.design_lab_upload_ratings.findMany({
        where: {
          ...(Object.keys(dateFilter).length > 0 ? { created_at: dateFilter } : {}),
        },
        select: {
          rating: true,
        },
      });
      const averageRating = uploadRatings.length > 0
        ? uploadRatings.reduce((sum, r) => sum + r.rating, 0) / uploadRatings.length
        : 0;

      res.json({
        success: true,
        data: {
          designCompletionRate: Math.round(designCompletionRate * 100) / 100,
          getPriceRate: Math.round(getPriceRate * 100) / 100,
          addToCartRate: Math.round(addToCartRate * 100) / 100,
          checkoutRate: Math.round(checkoutRate * 100) / 100,
          customerServiceRate: Math.round(customerServiceRate * 100) / 100,
          averageUploadRating: Math.round(averageRating * 100) / 100,
          // 详细数据
          details: {
            designStarted,
            designCompleted,
            getPriceClicked,
            getPriceCompleted,
            addToCartSuccess,
            checkoutStarted,
            checkoutCompleted,
            designLabOpened,
            customerServiceClicked,
            uploadRatingsCount: uploadRatings.length,
          },
        },
      });
    } catch (error) {
      // 如果表不存在，返回模拟数据
      logger.warn('[DesignLabAnalytics] Analytics tables may not exist:', error.message);

      res.json({
        success: true,
        data: {
          designCompletionRate: 0,
          getPriceRate: 0,
          addToCartRate: 0,
          checkoutRate: 0,
          customerServiceRate: 0,
          averageUploadRating: 0,
          details: {
            note: 'Analytics tables not yet created. Metrics will be available after database migration.',
          },
        },
      });
    }
  } catch (error) {
    logger.error('[DesignLabAnalytics] Error getting metrics:', error);
    next(error);
  }
};

