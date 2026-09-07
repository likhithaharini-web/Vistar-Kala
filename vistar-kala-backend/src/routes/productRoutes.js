const express = require('express');
const { body } = require('express-validator');
const productController = require('../controllers/productController');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const validate = require('../middleware/validate');

const router = express.Router();

router.post(
  '/products',
  authenticate,
  requireRole('artisan'),
  [body('name').isString().notEmpty()],
  validate,
  productController.createProduct,
);

router.get('/products', optionalAuthenticate, productController.listProducts);
router.get('/products/:id', productController.getProduct);
router.put('/products/:id', authenticate, productController.updateProduct);
router.delete('/products/:id', authenticate, productController.deleteProduct);

router.post('/products/:id/images', authenticate, productController.addProductImage);
router.post('/products/:id/report', authenticate, productController.reportProduct);

module.exports = router;
