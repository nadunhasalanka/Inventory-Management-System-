const mongoose = require('mongoose');

// this"freezes" the product data at the time of sale.
const LineItemSnapshotSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    sku: {
        type: String,
        required: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    quantity: {
        type: Number,
        required: [true, 'Please provide a quantity'],
        min: [1, 'Quantity must be at least 1']
    },
    unit_price: {
        type: Number,
        required: [true, 'Please provide a unit price'],
        min: [0, 'Unit price cannot be negative']
    },
    total_price: {
        type: Number,
        required: true,
        min: [0, 'Total price cannot be negative']
    }
});

const ShippingDetailsSchema = new mongoose.Schema({
    address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        postal_code: { type: String, trim: true },
        country: { type: String, trim: true }
    },
    carrier: { type: String, trim: true },
    tracking_number: { type: String, trim: true },
    shipping_cost: { type: Number, min: 0, default: 0 }
});

const SalesOrderSchema = new mongoose.Schema({
    order_number: {
        type: String,
        required: [true, 'Please provide an order number'],
        unique: true,
        trim: true,
        index: true
    },
    customer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
        index: true
    },
    order_date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        required: true,
        enum: [
            'New', 
            'Backordered', 
            'Preordered', 
            'Awaiting Fulfillment', 
            'Fulfilled', 
            'Partially Returned', 
            'Cancelled'
        ],
        default: 'New'
    },
    payment_status: {
        type: String,
        required: true,
        enum: ['Pending Credit', 'Paid', 'Refunded', 'Pending Payment', 'Partially Paid'],
        default: 'Pending Payment'
    },
    
    line_items: [LineItemSnapshotSchema],
    
    shipping_details: ShippingDetailsSchema,
    
    return_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReturnsExchange'
    }]
    
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

SalesOrderSchema.virtual('grand_total').get(function() {
    if (this.line_items.length === 0) {
        return 0;
    }
    const items_total = this.line_items.reduce((total, item) => total + item.total_price, 0);
    const shipping = this.shipping_details ? this.shipping_details.shipping_cost : 0;
    return items_total + shipping;
});

module.exports = mongoose.model('SalesOrder', SalesOrderSchema);