const mongoose = require('mongoose');
const SalesOrder = require('../models/SalesOrder.model');
const ReturnsExchange = require('../models/Returns_Exchange.model');
const InventoryStock = require('../models/Inventory_Stock.model');
const Transaction = require('../models/Transaction.model');
const Customer = require('../models/Customer.model');
const Product = require('../models/Product.model');
const asyncHandler = require('../middleware/asyncHandler');

// Helper: compute refundable availability map for a sales order
async function computeRefundableMap(soId) {
  const so = await SalesOrder.findById(soId);
  if (!so) throw new Error('Sales Order not found');

  const priorReturns = await ReturnsExchange.find({ sales_order_id: soId });
  const returnedByProduct = new Map();
  for (const ret of priorReturns) {
    for (const line of ret.return_line_items) {
      const k = String(line.product_id);
      returnedByProduct.set(k, (returnedByProduct.get(k) || 0) + line.quantity);
    }
  }

  // Build map: product_id -> { unit_price, orderedQty, availableQty }
  const map = new Map();
  for (const li of so.line_items) {
    const k = String(li.product_id);
    const already = returnedByProduct.get(k) || 0;
    const available = Math.max(0, li.quantity - already);
    map.set(k, { unit_price: li.unit_price, orderedQty: li.quantity, availableQty: available, sku: li.sku, name: li.name });
  }
  return { so, map };
}

// POST /api/returns
exports.createReturn = asyncHandler(async (req, res) => {
  console.log('=== NEW returns.controller.js - createReturn called ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  const { sales_order_id, items, type = 'Refund', reason = '', restock_location_id } = req.body;
  if (!sales_order_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'sales_order_id and items are required' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { so, map } = await computeRefundableMap(sales_order_id);

    // Validate: Returns only allowed within 5 days of sale
    const orderDate = so.order_date || so.createdAt;
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
    if (!orderDate || (Date.now() - new Date(orderDate).getTime()) > fiveDaysMs) {
      throw new Error('Returns are only allowed within 5 days of the sale date');
    }

    let refund_amount = 0;
    const return_line_items = [];

    for (const it of items) {
      const pid = String(it.product_id);
      const qty = Number(it.quantity);
      if (!map.has(pid)) throw new Error('Product not found on this sales order');
      if (!qty || qty <= 0) throw new Error('Invalid return quantity');
      const meta = map.get(pid);
      if (qty > meta.availableQty) throw new Error(`Return qty exceeds available for ${meta.name}`);

      refund_amount += meta.unit_price * qty;
      return_line_items.push({ product_id: it.product_id, quantity: qty, reason: it.reason || reason || 'Not specified' });
    }

    const ret = (await ReturnsExchange.create([
      {
        return_number: `RET-${Date.now()}`,
        sales_order_id,
        type: 'Refund',
        status: 'Processed',
        return_line_items,
        refund_amount,
        restock_location_id: restock_location_id || null,
      },
    ], { session }))[0];

    // Restock inventory and log transactions
    for (const line of return_line_items) {
      if (restock_location_id) {
        // Fetch the product to get its current unit_cost for the transaction record
        const product = await Product.findById(line.product_id).session(session);
        if (!product) throw new Error(`Product ${line.product_id} not found`);

        const stock = await InventoryStock.findOneAndUpdate(
          { product_id: line.product_id, location_id: restock_location_id },
          { $inc: { current_quantity: line.quantity } },
          { new: true, upsert: true, session }
        );
        await Transaction.create([
          {
            type: 'IN',
            product_id: line.product_id,
            location_id: restock_location_id,
            quantity_delta: line.quantity,
            cost_at_time_of_tx: product.unit_cost,
            balance_after: stock.current_quantity,
            user_id: req.user.id,
            source_type: 'ReturnsExchange',
            source_id: ret._id,
          },
        ], { session });
      }
    }

    // Update SalesOrder to track this return
    so.return_ids = so.return_ids || [];
    so.return_ids.push(ret._id);
    
    // Update status to 'Partially Returned' (you could add logic to check if fully returned)
    so.status = 'Partially Returned';

    // Adjust customer's credit balance if applicable
    if ((so.payment_type === 'Credit' || so.payment_type === 'Split') && refund_amount > 0) {
      const reduceBy = Math.min(refund_amount, so.credit_outstanding || 0);
      if (reduceBy > 0) {
        await Customer.findByIdAndUpdate(so.customer_id, { $inc: { current_balance: -reduceBy } }, { session });
        // Update SalesOrder credit_outstanding and payment_status
        const newOutstanding = (so.credit_outstanding || 0) - reduceBy;
        so.credit_outstanding = Math.max(0, newOutstanding);
        if (so.credit_outstanding === 0) {
          so.payment_status = 'Paid';
        }
      }
    }
    
    // For cash sales, update payment_status to 'Refunded'
    if (so.payment_type === 'Cash' && refund_amount > 0) {
      so.payment_status = 'Refunded';
    }

    await so.save({ session });

    await session.commitTransaction();
    session.endSession();
    res.status(201).json({ success: true, data: ret });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Return creation error:', err);
    res.status(400).json({ success: false, message: err.message || 'Return processing failed' });
  }
});

// GET /api/returns
exports.getReturns = asyncHandler(async (req, res) => {
  const list = await ReturnsExchange.find({}).sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: list.length, data: list });
});

// GET /api/returns/:id
exports.getReturnById = asyncHandler(async (req, res) => {
  const ret = await ReturnsExchange.findById(req.params.id);
  if (!ret) return res.status(404).json({ success: false, message: 'Return not found' });
  res.status(200).json({ success: true, data: ret });
});
