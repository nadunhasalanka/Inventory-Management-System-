const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            'IN',             // Goods received from a PO
            'OUT',            // Goods shipped for a SalesOrder
            'ADJUST',         // Manual stock adjustment (e.g., cycle count)
            'TRANSFER',       // Moving stock between locations
            'RETURN',         // Goods returned from a customer
            'ASSEMBLY_IN',    // Finished good created from a WorkOrder
            'ASSEMBLY_OUT'    // Components consumed by a WorkOrder
        ]
    },
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    location_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryLocation',
        required: true,
        index: true
    },
    quantity_delta: {
        type: Number,
        required: true,
        validate: {
            validator: function(v) { return v !== 0; },
            message: 'Quantity delta cannot be zero.'
        }
        // Positive for stock increases (IN, RETURN, ASSEMBLY_IN)
        // Negative for stock decreases (OUT, ADJUST, ASSEMBLY_OUT)
    },
    cost_at_time_of_tx: {
        type: Number,
        required: true,
        min: [0, 'Cost at time of transaction cannot be negative']
        // "Freezes" the product's cost, essential for FIFO/LIFO
    },
    balance_after: {
        type: Number,
        required: true,
        min: [0, 'Balance after transaction cannot be negative']
        // Stores the new `current_quantity` of the InventoryStock item
        // for easy auditing.
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    source_type: {
        type: String,
        required: true,
        enum: [
            'PurchaseOrder', 
            'SalesOrder', 
            'WorkOrder', 
            'ReturnsExchange', 
            'ManualAdjustment', 
            'Transfer'
        ]
    },
    source_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Transaction', TransactionSchema);