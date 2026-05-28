const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/adminFactoryQueueController');

router.use(requireAdmin);

router.get('/gang-sheet', ctrl.getGangSheetData);
router.get('/', ctrl.listFactoryQueue);
router.post('/:id/send-to-factory', ctrl.sendToFactory);
router.patch('/:id/production-status', ctrl.updateProductionStatus);
router.get('/:id/film-sheet', ctrl.getFilmSheetData);
router.get('/:id/qr', ctrl.getOrderQR);

module.exports = router;
