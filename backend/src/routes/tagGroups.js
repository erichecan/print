const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  listTagGroups,
  getTagGroup,
  createTagGroup,
  updateTagGroup,
  deleteTagGroup,
} = require('../controllers/tagGroupController');

// Public: fetch all active tag groups (used by frontend dropdowns)
router.get('/', listTagGroups);

// Admin-only CRUD
router.get('/:id', authenticateToken, requireAdmin, getTagGroup);
router.post('/', authenticateToken, requireAdmin, createTagGroup);
router.put('/:id', authenticateToken, requireAdmin, updateTagGroup);
router.delete('/:id', authenticateToken, requireAdmin, deleteTagGroup);

module.exports = router;
