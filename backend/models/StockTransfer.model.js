const mongoose = require('mongoose');

const StockTransferSchema = new mongoose.Schema({
    transfer_number: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    from_location_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryLocation',
        required: true,
        index: true
    },
    to_location_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryLocation',
        required: true,
        index: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Transfer quantity must be at least 1']
    },
    status: {
        type: String,
        enum: ['pending', 'in-transit', 'completed', 'cancelled'],
        default: 'pending',
        index: true
    },
    initiated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    completed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    expected_date: {
        type: Date
    },
    completed_at: {
        type: Date
    },
    cancelled_at: {
        type: Date
    },
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Index for efficient querying
StockTransferSchema.index({ status: 1, createdAt: -1 });
StockTransferSchema.index({ product_id: 1, status: 1 });

module.exports = mongoose.model('StockTransfer', StockTransferSchema);
