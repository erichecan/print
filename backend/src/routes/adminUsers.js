// Admin user management routes
// 添加创建用户功能
const express = require('express');
const controller = require('../controllers/adminUserController');
const { requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../utils/schemas');

const router = express.Router();

router.use(requireAdmin);

router.get('/', validate(schemas.paginationQuery, 'query'), controller.listUsers);
router.post('/', controller.createUser); // 创建新用户
router.get('/:id', controller.getUserDetail);
router.patch('/:id/role', controller.updateUserRole);
router.delete('/:id', controller.deleteUser);
router.post('/:id/reset-password', controller.resetUserPassword);

module.exports = router;

