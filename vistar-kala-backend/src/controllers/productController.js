const { Op } = require('sequelize');
const { Product, ProductImage, User, ArtisanProfile } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// POST /products (artisan only)
const createProduct = asyncHandler(async (req, res) => {
  const artisanId = req.user.id;
  const {
    name,
    category,
    material,
    craftType,
    origin,
    description,
    englishDescription,
    hindiDescription,
    keywords,
    quantity,
    dimensions,
    productionTimeDays,
    customizationAvailable,
    isHandmade,
    isGI,
    price,
    images, // optional array of URLs
  } = req.body;

  if (!name) throw new ApiError(400, 'name is required');

  const product = await Product.create({
    artisanId,
    name,
    category,
    material,
    craftType,
    origin,
    description,
    englishDescription,
    hindiDescription,
    keywords: Array.isArray(keywords) ? keywords.join(',') : keywords,
    quantity,
    dimensions,
    productionTimeDays,
    customizationAvailable: !!customizationAvailable,
    isHandmade: isHandmade !== undefined ? !!isHandmade : true,
    isGI: !!isGI,
    price,
    status: 'DRAFT',
  });

  // Handle existing JSON array format
  if (Array.isArray(images)) {
    await Promise.all(images.map((url) => ProductImage.create({ productId: product.id, url, type: 'ORIGINAL' })));
  }

  // Handle multipart form upload via Cloudinary (req.file)
  if (req.file && req.file.path) {
    await ProductImage.create({ productId: product.id, url: req.file.path, type: 'ORIGINAL' });
  }

  const full = await Product.findByPk(product.id, { include: [{ model: ProductImage, as: 'images' }] });
  res.status(201).json({ success: true, product: full });
});

// GET /products  - also serves search & filtering (PRD section 14)
const listProducts = asyncHandler(async (req, res) => {
  const {
    q, // free text search across name/craft/material
    craft,
    material,
    artisanLocation,
    category,
    minPrice,
    maxPrice,
    craftType,
    handmade,
    gi,
    customization,
    availability, // 'in_stock' | 'any'
    status, // filter by status (defaults to PUBLISHED for public browsing)
    artisanId,
    page = 1,
    limit = 20,
  } = req.query;

  const where = {};
  where.status = status || 'PUBLISHED';
  if (artisanId) where.artisanId = artisanId;
  if (category) where.category = category;
  if (material) where.material = material;
  if (craftType) where.craftType = craftType;
  if (handmade !== undefined) where.isHandmade = handmade === 'true';
  if (gi !== undefined) where.isGI = gi === 'true';
  if (customization !== undefined) where.customizationAvailable = customization === 'true';
  if (availability === 'in_stock') where.quantity = { [Op.gt]: 0 };

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
    if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
  }

  if (q || craft) {
    const term = q || craft;
    where[Op.or] = [
      { name: { [Op.like]: `%${term}%` } },
      { craftType: { [Op.like]: `%${term}%` } },
      { material: { [Op.like]: `%${term}%` } },
      { category: { [Op.like]: `%${term}%` } },
    ];
  }

  const include = [{ model: ProductImage, as: 'images' }];

  // Filter by artisan location requires joining User -> ArtisanProfile
  if (artisanLocation) {
    include.push({
      model: User,
      as: 'artisan',
      required: true,
      include: [
        {
          model: ArtisanProfile,
          as: 'artisanProfile',
          required: true,
          where: { location: { [Op.like]: `%${artisanLocation}%` } },
        },
      ],
    });
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const { rows, count } = await Product.findAndCountAll({
    where,
    include,
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
    order: [['createdAt', 'DESC']],
    distinct: true,
  });

  res.json({
    success: true,
    products: rows,
    pagination: { page: pageNum, limit: limitNum, total: count, totalPages: Math.ceil(count / limitNum) },
  });
});

// GET /products/:id
const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id, {
    include: [{ model: ProductImage, as: 'images' }],
  });
  if (!product) throw new ApiError(404, 'Product not found');
  res.json({ success: true, product });
});

async function loadOwnedProduct(req) {
  const product = await Product.findByPk(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  if (product.artisanId !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'You do not have permission to modify this product');
  }
  return product;
}

// PUT /products/:id (owner artisan or admin)
const updateProduct = asyncHandler(async (req, res) => {
  const product = await loadOwnedProduct(req);

  const editableFields = [
    'name',
    'category',
    'material',
    'craftType',
    'origin',
    'description',
    'englishDescription',
    'hindiDescription',
    'quantity',
    'dimensions',
    'productionTimeDays',
    'customizationAvailable',
    'isHandmade',
    'isGI',
    'price',
    'status', // allows publish/unpublish: DRAFT | PUBLISHED | UNPUBLISHED
    'authenticationStatus',
  ];

  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) product[field] = req.body[field];
  });

  if (req.body.keywords !== undefined) {
    product.keywords = Array.isArray(req.body.keywords) ? req.body.keywords.join(',') : req.body.keywords;
  }

  // Only admins can directly set VERIFIED authentication status
  if (req.body.authenticationStatus === 'VERIFIED' && req.user.role !== 'admin') {
    throw new ApiError(403, 'Only admins can mark a product as VERIFIED');
  }

  await product.save();
  const full = await Product.findByPk(product.id, { include: [{ model: ProductImage, as: 'images' }] });
  res.json({ success: true, product: full });
});

// DELETE /products/:id (owner artisan or admin)
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await loadOwnedProduct(req);
  await product.destroy();
  res.json({ success: true, message: 'Product deleted' });
});

// POST /products/:id/images (owner artisan)
const addProductImage = asyncHandler(async (req, res) => {
  const product = await loadOwnedProduct(req);
  const { url, type } = req.body;
  if (!url) throw new ApiError(400, 'url is required');
  const image = await ProductImage.create({
    productId: product.id,
    url,
    type: type === 'ENHANCED' ? 'ENHANCED' : 'ORIGINAL',
  });
  res.status(201).json({ success: true, image });
});

// POST /products/:id/report (any authenticated user)
const reportProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  product.isReported = true;
  await product.save();
  res.json({ success: true, message: 'Product reported for admin review' });
});

module.exports = {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  addProductImage,
  reportProduct,
};
