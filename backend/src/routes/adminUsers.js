// [2025-11-15 14:05:00] Admin user management routes
// [2025-01-28 18:30:00] 添加创建用户功能
const express = require('express');
const controller = require('../controllers/adminUserController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/', controller.listUsers);
router.post('/', controller.createUser); // [2025-01-28 18:30:00] 创建新用户
router.get('/:id', controller.getUserDetail);
router.patch('/:id/role', controller.updateUserRole);
router.delete('/:id', controller.deleteUser);
router.post('/:id/reset-password', controller.resetUserPassword);

module.exports = router;

