const express = require('express');
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

router.post('/orders', authenticate, requireRole('buyer'), orderController.createOrder);
router.get('/orders', authenticate, orderController.listOrders);
router.get('/orders/:id', authenticate, orderController.getOrder);
router.put('/orders/:id/status', authenticate, orderController.updateOrderStatus);

module.exports = router;
