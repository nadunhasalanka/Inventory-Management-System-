const InventoryStock = require('../models/Inventory_Stock.model');
const Transaction = require('../models/Transaction.model');
const Product = require('../models/Product.model');
const InventoryLocation = require('../models/Inventory_Locations.model');
const asyncHandler = require('../middleware/asyncHandler');

//  @route   POST /api/inventory/adjust
exports.adjustStock = asyncHandler(async (req, res, next) => {
    const { product_id, location_id, new_quantity } = req.body;
    const user_id = req.user.id;

    const newQuantityNum = Number(new_quantity);
    if (newQuantityNum == null || newQuantityNum < 0 || isNaN(newQuantityNum)) {
        return res.status(400).json({ success: false, message: 'New quantity must be a number 0 or greater.' });
    }

    const product = await Product.findById(product_id).select('unit_cost');
    if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Validate location exists
    const location = await InventoryLocation.findById(location_id).select('_id');
    if (!location) {
        return res.status(404).json({ success: false, message: 'Location not found.' });
    }

    const stockItem = await InventoryStock.findOne({
        product_id: product_id,
        location_id: location_id
    });

    const old_quantity = stockItem ? stockItem.current_quantity : 0;
    const quantity_delta = newQuantityNum - old_quantity;

    if (quantity_delta === 0) {
        return res.status(400).json({ success: false, message: 'No change in quantity. Adjustment not needed.' });
    }

    // It finds the document and updates it, OR creates it if it doesn't exist.
    const updatedStockItem = await InventoryStock.findOneAndUpdate(
        { product_id: product_id, location_id: location_id }, // The filter to find the item
        { 
            $set: { current_quantity: newQuantityNum }, // The update to apply
            $setOnInsert: { // Fields to set *only* if a new document is created
                product_id: product_id,
                location_id: location_id,
                min_stock_level: 0 
            }
        },
        { 
            new: true,       // Return the *new* (updated) document
            upsert: true,    // Create the document if it doesn't exist
            runValidators: true 
        }
    );

    await Transaction.create({
        type: 'ADJUST',
        product_id: product_id,
        location_id: location_id,
        quantity_delta: quantity_delta, 
        cost_at_time_of_tx: product.unit_cost, 
        balance_after: newQuantityNum,
        user_id: user_id,
        source_type: 'ManualAdjustment',
        source_id: updatedStockItem._id 
    });

    res.status(200).json({
        success: true,
        data: updatedStockItem
    });
});