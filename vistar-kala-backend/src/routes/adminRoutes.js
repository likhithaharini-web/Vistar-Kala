const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

router.use('/admin', authenticate, requireRole('admin'));

router.get('/admin/artisans', adminController.listArtisans);
router.put('/admin/artisans/:id/verify', adminController.verifyArtisan);

router.get('/admin/certifications', adminController.listCertifications);
router.put('/admin/certifications/:id/review', adminController.reviewCertification);

router.get('/admin/products/reported', adminController.listReportedProducts);
router.put('/admin/products/:id/resolve-report', adminController.resolveProductReport);

router.get('/admin/auctions', adminController.monitorAuctions);
router.get('/admin/requirements', adminController.monitorRequirements);

router.get('/admin/users', adminController.listUsers);
router.put('/admin/users/:id/role', adminController.updateUserRole);

router.put('/admin/disputes/:orderId/resolve', adminController.resolveDispute);

router.get('/admin/market-prices', adminController.listMarketPrices);
router.post('/admin/market-prices', adminController.createMarketPrice);
router.put('/admin/market-prices/:id', adminController.updateMarketPrice);
router.delete('/admin/market-prices/:id', adminController.deleteMarketPrice);

module.exports = router;
