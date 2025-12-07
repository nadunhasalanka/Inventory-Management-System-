const mongoose = require('mongoose');
const SalesOrder = require('../models/SalesOrder.model');
const Customer = require('../models/Customer.model');
const Product = require('../models/Product.model');
const InventoryStock = require('../models/Inventory_Stock.model');
const Transaction = require('../models/Transaction.model');
const asyncHandler = require('../middleware/asyncHandler');

//  @route   POST /api/checkout
exports.processCheckout = asyncHandler(async (req, res, next) => {
    
    const {
        customer_id, location_id, line_items,
        payment_type, amount_paid_cash, amount_to_credit,
        due_date, allowed_delay_days
    } = req.body;
    const user_id = req.user.id;

    if (!line_items || line_items.length === 0) {
        return res.status(400).json({ success: false, message: 'Cart is empty.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const customer = await Customer.findById(customer_id).session(session);
        if (!customer) { throw new Error('Customer not found'); }
        
        const validated_line_items = [];
        let calculated_grand_total = 0;

        for (const item of line_items) {
            const product = await Product.findById(item.product_id).session(session);
            if (!product) { throw new Error(`Product ${item.product_id} not found.`); }

            const stockItem = await InventoryStock.findOne({ 
                product_id: item.product_id, 
                location_id: location_id 
            }).session(session);

            if (!stockItem || stockItem.current_quantity < item.quantity) {
                throw new Error(`Not enough stock for ${product.name}. Only ${stockItem ? stockItem.current_quantity : 0} available.`);
            }

            const correct_unit_price = product.selling_price;
            const correct_total_price = correct_unit_price * item.quantity;
            
            // Build line item with variant info if present
            const lineItem = {
                product_id: product._id, 
                sku: product.sku, 
                name: product.name,
                quantity: item.quantity, 
                unit_price: correct_unit_price, 
                total_price: correct_total_price
            };

            // Add variant information if provided
            if (item.variant_info) {
                lineItem.variant_info = {
                    name: item.variant_info.name,
                    value: item.variant_info.value,
                    sku_suffix: item.variant_info.sku_suffix || '',
                    additional_price: item.variant_info.additional_price || 0
                };
            }

            validated_line_items.push(lineItem);
            calculated_grand_total += correct_total_price;
        }

    let payment_status = 'Paid';
    let customerBalanceUpdate = 0; // How much to move to customer.current_balance
    let credit_total = 0; // Original credited principal
    let amountCash = 0;
    let amountCredit = 0;

        if (payment_type === 'Credit') {
            payment_status = 'Pending Credit';
            customerBalanceUpdate = calculated_grand_total;
            credit_total = calculated_grand_total;
            amountCredit = calculated_grand_total;
        } else if (payment_type === 'Split') {
            payment_status = 'Partially Paid';
            const totalPayment = (amount_paid_cash || 0) + (amount_to_credit || 0);
            if (totalPayment !== calculated_grand_total) {
                throw new Error(`Payment split total (${totalPayment}) does not match the cart total (${calculated_grand_total}).`);
            }
            customerBalanceUpdate = amount_to_credit;
            credit_total = amount_to_credit || 0;
            amountCash = amount_paid_cash || 0;
            amountCredit = amount_to_credit || 0;
        } else { // Cash
            amountCash = calculated_grand_total;
        }
        
        if (customerBalanceUpdate > 0) {
            
            if (customer.credit_limit === 0) {
                throw new Error(`Customer ${customer.name} is not authorized for credit sales.`);
            }

            const available_credit = customer.credit_limit - customer.current_balance;
            
            if (customerBalanceUpdate > available_credit) {
                throw new Error(
                    `Credit limit exceeded. Available: ${available_credit}, Requested: ${customerBalanceUpdate}`
                );
            }
        }

        // Calculate allowed_until from due_date + allowed_delay_days
        let allowed_until = null;
        if ((payment_type === 'Credit' || payment_type === 'Split') && due_date && allowed_delay_days > 0) {
            const dueDate = new Date(due_date);
            allowed_until = new Date(dueDate.getTime() + (allowed_delay_days * 24 * 60 * 60 * 1000));
        }

        const so = (await SalesOrder.create([{
            order_number: `POS-${Date.now()}`,
            customer_id: customer_id,
            payment_status: payment_status,
            payment_type: payment_type,
            line_items: validated_line_items,
            status: 'Fulfilled',
            // Credit tracking & snapshot fields
            due_date: payment_type === 'Credit' || payment_type === 'Split' ? (due_date || null) : null,
            allowed_until: allowed_until,
            credit_total: credit_total,
            credit_outstanding: credit_total, // At creation outstanding equals total credited
            amount_paid_cash: amountCash,
            amount_to_credit: amountCredit,
            subtotal_snapshot: calculated_grand_total, // No discount/tax logic yet
            discount_total: 0
        }], { session: session }))[0];

        if (customerBalanceUpdate > 0) {
            await Customer.findByIdAndUpdate(
                customer_id,
                { $inc: { current_balance: customerBalanceUpdate } },
                { session: session }
            );
        }

        // FIFO batch deduction and COGS tracking
        for (const item of validated_line_items) {
            const stockItem = await InventoryStock.findOne(
                { product_id: item.product_id, location_id: location_id }
            ).session(session);

            if (!stockItem) {
                throw new Error(`Stock item not found for product ${item.product_id}`);
            }

            // Sort batches by received_date (FIFO - First In, First Out)
            const sortedBatches = [...stockItem.batches].sort((a, b) => 
                new Date(a.received_date) - new Date(b.received_date)
            );

            let remainingQty = item.quantity;
            let totalCost = 0;
            const updatedBatches = [];

            // Deduct from oldest batches first (FIFO)
            for (const batch of sortedBatches) {
                if (remainingQty <= 0) {
                    updatedBatches.push(batch);
                    continue;
                }

                if (batch.quantity <= remainingQty) {
                    // Consume entire batch
                    totalCost += batch.quantity * batch.unit_cost;
                    remainingQty -= batch.quantity;
                    // Don't push this batch (it's fully consumed)
                } else {
                    // Partially consume batch
                    totalCost += remainingQty * batch.unit_cost;
                    updatedBatches.push({
                        ...batch.toObject(),
                        quantity: batch.quantity - remainingQty
                    });
                    remainingQty = 0;
                }
            }

            if (remainingQty > 0) {
                throw new Error(`Not enough batch quantity for ${item.name}. Missing ${remainingQty} units.`);
            }

            // Calculate average COGS for this sale
            const avgCost = totalCost / item.quantity;

            // Update inventory with new batches and reduced quantity
            const updatedStockItem = await InventoryStock.findOneAndUpdate(
                { product_id: item.product_id, location_id: location_id },
                { 
                    $set: { 
                        batches: updatedBatches,
                        current_quantity: stockItem.current_quantity - item.quantity
                    }
                },
                { new: true, session: session }
            );

            // Create transaction log with actual COGS
            await Transaction.create([{
                type: 'OUT',
                product_id: item.product_id,
                location_id: location_id,
                quantity_delta: -item.quantity,
                cost_at_time_of_tx: avgCost, // Use actual COGS from batches
                balance_after: updatedStockItem.current_quantity,
                user_id: user_id,
                source_type: 'SalesOrder',
                source_id: so._id
            }], { session: session });
        }

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ success: true, data: so });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, message: err.message });
    }
});