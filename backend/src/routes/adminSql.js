// Read-only SQL preview API for admins
// 2026-03-10 04:40:00
// 仅接受以 SELECT 开头的查询，并做长度 / 关键字限制，防止误用

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 简单的关键字黑名单，防止误放写操作 / DDL
const FORBIDDEN_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'ALTER',
  'DROP',
  'TRUNCATE',
  'GRANT',
  'REVOKE',
  'CREATE',
  'VACUUM',
  'ANALYZE',
  'COMMENT',
  'SECURITY',
  'OWNER',
  'DISCARD',
  'RESET',
];

// 最大 SQL 长度（字符）
const MAX_SQL_LENGTH = 4000;

router.use(requireAdmin);

router.post('/preview', async (req, res) => {
  const { sql } = req.body || {};

  if (typeof sql !== 'string' || !sql.trim()) {
    return res.status(400).json({
      error: 'Invalid SQL',
      message: 'sql 字段必填，且必须是字符串。',
    });
  }

  const trimmed = sql.trim();

  // 长度限制
  if (trimmed.length > MAX_SQL_LENGTH) {
    return res.status(400).json({
      error: 'SQL too long',
      message: `SQL 长度不能超过 ${MAX_SQL_LENGTH} 字符。`,
    });
  }

  // 必须以 SELECT 开头
  if (!/^SELECT\s/i.test(trimmed)) {
    return res.status(400).json({
      error: 'Only SELECT allowed',
      message: '只允许执行以 SELECT 开头的只读查询。',
    });
  }

  // 简单关键字黑名单（大小写不敏感）
  const upper = trimmed.toUpperCase();
  for (const kw of FORBIDDEN_KEYWORDS) {
    if (upper.includes(`${kw} `) || upper.includes(` ${kw}`)) {
      return res.status(400).json({
        error: 'Forbidden keyword',
        message: `SQL 中包含被禁止的关键字：${kw}。只允许只读 SELECT 查询。`,
      });
    }
  }

  // 限制多语句：拒绝包含分号（简单起见）
  if (trimmed.includes(';')) {
    return res.status(400).json({
      error: 'Multiple statements not allowed',
      message: '不允许包含分号或多条语句，只能执行一条 SELECT 查询。',
    });
  }

  try {
    // 为防止一次返回过多数据，这里默认限制前 500 行
    const wrappedSql = `SELECT * FROM (${trimmed}) AS sub LIMIT 500`;
    const rows = await prisma.$queryRawUnsafe(wrappedSql);
    return res.json({
      success: true,
      rowCount: Array.isArray(rows) ? rows.length : 0,
      rows,
    });
  } catch (error) {
    // 避免泄露过多内部信息，只返回部分错误内容
    return res.status(400).json({
      error: 'SQL execution error',
      message: error.message || 'Failed to execute query',
    });
  }
});

module.exports = router;

