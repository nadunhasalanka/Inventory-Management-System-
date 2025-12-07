const mongoose = require('mongoose');
const ReturnsExchange = require('../models/Returns_Exchange.model');
const SalesOrder = require('../models/SalesOrder.model');
const Customer = require('../models/Customer.model');
const InventoryStock = require('../models/Inventory_Stock.model');
const Transaction = require('../models/Transaction.model');
const InventoryLocation = require('../models/Inventory_Locations.model');
const asyncHandler = require('../middleware/asyncHandler');

//  @route   POST /api/returns
exports.processDirectReturn = asyncHandler(async (req, res, next) => {
    const { 
        sales_order_id, 
        return_line_items, 
        restock_location_id, 
        refund_amount, 
        return_number 
    } = req.body;
    const user_id = req.user.id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const so = await SalesOrder.findById(sales_order_id).session(session);
        if (!so) { throw new Error('Sales Order not found'); }

        const location = await InventoryLocation.findById(restock_location_id).session(session);
        if (!location) { throw new Error('Restock location not found.'); }

        const existingReturns = await ReturnsExchange.find({ sales_order_id: sales_order_id }).session(session);

        for (const itemToReturn of return_line_items) {
            const soLineItem = so.line_items.find(
                (line) => line.product_id.toString() === itemToReturn.product_id
            );
            if (!soLineItem) {
                throw new Error(`Product ${itemToReturn.product_id} was not part of the original sales order.`);
            }

            let quantityAlreadyReturned = 0;
            existingReturns.forEach(ret => {
                ret.return_line_items.forEach(line => {
                    if (line.product_id.toString() === itemToReturn.product_id) {
                        quantityAlreadyReturned += line.quantity;
                    }
                });
            });

            const quantityAvailableToReturn = soLineItem.quantity - quantityAlreadyReturned;
            if (itemToReturn.quantity > quantityAvailableToReturn) {
                throw new Error(`Cannot return ${itemToReturn.quantity} units. Only ${quantityAvailableToReturn} are eligible.`);
            }
        }

        const newReturn = (await ReturnsExchange.create([{
            return_number: return_number,
            sales_order_id: sales_order_id,
            return_line_items: return_line_items,
            refund_amount: refund_amount,
            restock_location_id: restock_location_id,
            type: 'Refund',
            status: 'Processed' 
        }], { session: session }))[0];

        for (const item of return_line_items) {
            const stockUpdate = await InventoryStock.findOneAndUpdate(
                { product_id: item.product_id, location_id: restock_location_id },
                { $inc: { current_quantity: item.quantity } },
                { upsert: true, new: true, session: session }
            );

            await Transaction.create([{
                type: 'RETURN',
                product_id: item.product_id,
                location_id: restock_location_id,
                quantity_delta: item.quantity,
                cost_at_time_of_tx: 0,
                balance_after: stockUpdate.current_quantity,
                user_id: user_id,
                source_type: 'ReturnsExchange',
                source_id: newReturn._id
            }], { session: session });
        }

        if (so.payment_status === 'Pending Credit' && refund_amount > 0) {
            await Customer.findByIdAndUpdate(
                so.customer_id,
                { $inc: { current_balance: -refund_amount } }, // Decrease debt
                { session: session }
            );
        }

        so.return_ids.push(newReturn._id);
        so.status = 'Partially Returned'; // (Add logic later for "Returned")
        await so.save({ session: session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ success: true, data: newReturn });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, message: err.message });
    }
});
