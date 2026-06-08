const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
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
router.use(requireAdmin);
router.get('/:id', getTagGroup);
router.post('/', createTagGroup);
router.put('/:id', updateTagGroup);
router.delete('/:id', deleteTagGroup);

module.exports = router;
