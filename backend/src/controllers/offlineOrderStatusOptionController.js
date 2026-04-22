// ============================================================================
// 线下订单「状态选项」字典表 controller
// 2026-04-20 列表改造：status 从 enum 改成自由文本 + 可自定义选项
//
// 系统预置 20 条（is_system = true），用户不可删除
// 用户可在下拉框底部「+ 添加新选项」追加新值
// ============================================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

/**
 * GET /api/admin/offline-orders/status-options
 *
 * 返回所有状态选项，sort_order ASC，系统选项优先
 */
exports.listStatusOptions = async (req, res) => {
  try {
    const options = await prisma.offlineOrderStatusOption.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    });

    res.json({
      success: true,
      options: options.map((opt) => ({
        id: opt.id,
        value: opt.value,
        label: opt.label,
        sortOrder: opt.sortOrder,
        isSystem: opt.isSystem,
        createdBy: opt.createdBy,
        createdAt: opt.createdAt,
        updatedAt: opt.updatedAt
      }))
    });
  } catch (error) {
    logger.error('[statusOption] list failed', error);
    res.status(500).json({
      error: 'Server Error',
      message: '无法获取状态选项列表'
    });
  }
};

/**
 * POST /api/admin/offline-orders/status-options
 * body: { value: string, label?: string }
 *
 * 只允许用户新增非系统选项（is_system=false）
 * value 必须唯一；若重复返回 409
 */
exports.createStatusOption = async (req, res) => {
  try {
    const { value, label } = req.body || {};

    const trimmed = value?.toString().trim();
    if (!trimmed) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'value 不能为空'
      });
    }
    if (trimmed.length > 50) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'value 长度不能超过 50 个字符'
      });
    }

    const existing = await prisma.offlineOrderStatusOption.findUnique({
      where: { value: trimmed }
    });
    if (existing) {
      return res.status(409).json({
        error: 'Conflict',
        message: '该状态选项已存在',
        option: {
          id: existing.id,
          value: existing.value,
          label: existing.label,
          isSystem: existing.isSystem
        }
      });
    }

    // 新增选项 sort_order = 当前最大 + 10，保证排在末尾
    const maxSort = await prisma.offlineOrderStatusOption.aggregate({
      _max: { sortOrder: true }
    });
    const nextSort = (maxSort._max.sortOrder ?? 0) + 10;

    const created = await prisma.offlineOrderStatusOption.create({
      data: {
        value: trimmed,
        label: (label?.toString().trim()) || trimmed,
        sortOrder: nextSort,
        isSystem: false,
        createdBy: req.user?.id || null
      }
    });

    res.status(201).json({
      success: true,
      option: {
        id: created.id,
        value: created.value,
        label: created.label,
        sortOrder: created.sortOrder,
        isSystem: created.isSystem,
        createdBy: created.createdBy,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt
      }
    });
  } catch (error) {
    logger.error('[statusOption] create failed', error);
    res.status(500).json({
      error: 'Server Error',
      message: '创建状态选项失败'
    });
  }
};

/**
 * DELETE /api/admin/offline-orders/status-options/:id
 * 系统选项不可删除；用户自建选项允许删除
 */
exports.deleteStatusOption = async (req, res) => {
  try {
    const { id } = req.params;
    const opt = await prisma.offlineOrderStatusOption.findUnique({ where: { id } });
    if (!opt) {
      return res.status(404).json({ error: 'Not Found', message: '状态选项不存在' });
    }
    if (opt.isSystem) {
      return res.status(403).json({
        error: 'Forbidden',
        message: '系统预置选项不可删除'
      });
    }

    await prisma.offlineOrderStatusOption.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    logger.error('[statusOption] delete failed', error);
    res.status(500).json({
      error: 'Server Error',
      message: '删除状态选项失败'
    });
  }
};
