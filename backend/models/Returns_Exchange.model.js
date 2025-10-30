const mongoose = require('mongoose');

const ReturnLineItemSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: [true, 'Please provide return quantity'],
        min: [1, 'Return quantity must be at least 1']
    },
    reason: {
        type: String,
        trim: true,
        default: 'Not specified'
    }
});

const ReturnsExchangeSchema = new mongoose.Schema({
    return_number: {
        type: String,
        required: [true, 'Please provide a return number (RMA)'],
        unique: true,
        trim: true,
        index: true
    },
    sales_order_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalesOrder',
        required: true,
        index: true
    },
    return_date: {
        type: Date,
        default: Date.now
    },
    type: {
        type: String,
        required: true,
        enum: ['Refund', 'Exchange']
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Received', 'Processed', 'Rejected'],
        default: 'Pending'
    },
    
    return_line_items: [ReturnLineItemSchema],
    
    refund_amount: {
        type: Number,
        min: [0, 'Refund amount cannot be negative'],
        default: 0
    },
    restock_location_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryLocation',
        default: null 
    }
    
}, {
    timestamps: true
});

module.exports = mongoose.model('ReturnsExchange', ReturnsExchangeSchema);