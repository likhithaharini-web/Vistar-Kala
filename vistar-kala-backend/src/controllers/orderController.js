const { Order, Product, User } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { notify } = require('../services/notificationService');

const STATUS_FLOW = ['Confirmed', 'In Production', 'Ready', 'Shipped', 'Delivered'];

// POST /orders (buyer only) - direct purchase of a published product
const createOrder = asyncHandler(async (req, res) => {
  if (req.user.role !== 'buyer') throw new ApiError(403, 'Only buyers can place direct orders');

  const { productId, quantity, shippingAddress } = req.body;
  if (!productId || !shippingAddress) throw new ApiError(400, 'productId and shippingAddress are required');

  const product = await Product.findByPk(productId);
  if (!product) throw new ApiError(404, 'Product not found');
  if (product.status !== 'PUBLISHED') throw new ApiError(400, 'Product is not available for purchase');

  const qty = quantity || 1;
  if (product.quantity !== null && product.quantity !== undefined && product.quantity < qty) {
    throw new ApiError(400, 'Requested quantity exceeds available stock');
  }

  const order = await Order.create({
    buyerId: req.user.id,
    artisanId: product.artisanId,
    productId: product.id,
    sourceType: 'DIRECT',
    quantity: qty,
    price: product.price * qty,
    shippingAddress,
    status: 'Confirmed',
  });

  if (product.quantity !== null && product.quantity !== undefined) {
    product.quantity -= qty;
    await product.save();
  }

  await notify(product.artisanId, 'NEW_ORDER', `You have a new order for "${product.name}".`, {
    type: 'Order',
    id: order.id,
  });

  res.status(201).json({ success: true, order });
});

// GET /orders - scoped to the logged-in user's role, unless admin
const listOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const where = {};
  if (status) where.status = status;

  if (req.user.role === 'buyer') where.buyerId = req.user.id;
  else if (req.user.role === 'artisan') where.artisanId = req.user.id;
  // admin sees all orders

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const { rows, count } = await Order.findAndCountAll({
    where,
    include: [{ model: Product, as: 'product' }],
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
    order: [['createdAt', 'DESC']],
  });

  res.json({
    success: true,
    orders: rows,
    pagination: { page: pageNum, limit: limitNum, total: count, totalPages: Math.ceil(count / limitNum) },
  });
});

// GET /orders/:id
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id, { include: [{ model: Product, as: 'product' }] });
  if (!order) throw new ApiError(404, 'Order not found');

  const isParticipant = order.buyerId === req.user.id || order.artisanId === req.user.id;
  if (!isParticipant && req.user.role !== 'admin') {
    throw new ApiError(403, 'You do not have access to this order');
  }

  res.json({ success: true, order });
});

// PUT /orders/:id/status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');

  const isParticipant = order.buyerId === req.user.id || order.artisanId === req.user.id;
  if (!isParticipant && req.user.role !== 'admin') {
    throw new ApiError(403, 'You do not have access to this order');
  }

  const { status, deliveryInfo, paymentStatus } = req.body;
  if (!status) throw new ApiError(400, 'status is required');

  if (status === 'Cancelled') {
    if (order.status !== 'Confirmed') {
      throw new ApiError(400, 'Only orders still in "Confirmed" status can be cancelled');
    }
  } else {
    const currentIdx = STATUS_FLOW.indexOf(order.status);
    const nextIdx = STATUS_FLOW.indexOf(status);
    if (nextIdx === -1) throw new ApiError(400, `Invalid status. Must be one of: ${STATUS_FLOW.join(', ')}, Cancelled`);
    if (nextIdx !== currentIdx + 1) {
      throw new ApiError(
        400,
        `Invalid transition from "${order.status}" to "${status}". Orders must progress in order: ${STATUS_FLOW.join(' -> ')}`,
      );
    }
    // Only the artisan (or admin) advances production/shipping states
    if (req.user.role === 'buyer' && req.user.id !== order.buyerId) {
      throw new ApiError(403, 'Not authorized');
    }
  }

  order.status = status;
  if (deliveryInfo !== undefined) order.deliveryInfo = deliveryInfo;
  if (paymentStatus !== undefined) order.paymentStatus = paymentStatus;
  await order.save();

  const otherPartyId = req.user.id === order.buyerId ? order.artisanId : order.buyerId;
  await notify(otherPartyId, 'ORDER_UPDATE', `Order #${order.id} status updated to "${status}".`, {
    type: 'Order',
    id: order.id,
  });

  res.json({ success: true, order });
});

module.exports = { createOrder, listOrders, getOrder, updateOrderStatus };
