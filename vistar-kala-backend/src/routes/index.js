const express = require('express');

const authRoutes = require('./authRoutes');
const productRoutes = require('./productRoutes');
const aiRoutes = require('./aiRoutes');
const auctionRoutes = require('./auctionRoutes');
const requirementRoutes = require('./requirementRoutes');
const orderRoutes = require('./orderRoutes');
const notificationRoutes = require('./notificationRoutes');
const adminRoutes = require('./adminRoutes');
const translateRoutes = require('./translateRoutes');

const router = express.Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'Vistar Kala backend is running' }));

router.use(authRoutes);
router.use(productRoutes);
router.use(aiRoutes);
router.use(auctionRoutes);
router.use(requirementRoutes);
router.use(orderRoutes);
router.use(notificationRoutes);
router.use(adminRoutes);
router.use(translateRoutes);

module.exports = router;
