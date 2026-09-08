const express = require('express');
const { body } = require('express-validator');
const productController = require('../controllers/productController');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const validate = require('../middleware/validate');

// Use Cloudinary if configured, else fall back to local disk multer
let upload;
try {
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    upload = require('../services/cloudinaryService').upload;
  } else {
    upload = require('../middleware/upload');
  }
} catch (e) {
  upload = require('../middleware/upload');
}

const router = express.Router();

router.post(
  '/products',
  authenticate,
  requireRole('artisan'),
  upload.single('image'),
  [
    body('name').optional().isString(),
    body('title').optional().isString(),
    body().custom((_, { req }) => {
      if (!req.body.name && !req.body.title) {
        throw new Error('name or title is required');
      }
      return true;
    }),
  ],
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
