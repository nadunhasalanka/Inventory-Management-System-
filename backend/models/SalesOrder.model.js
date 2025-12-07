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
    },
    variant_info: {
        type: {
            name: { type: String, trim: true },        // e.g., "Size", "Color"
            value: { type: String, trim: true },       // e.g., "Large", "Red"
            sku_suffix: { type: String, trim: true },  // e.g., "-LG", "-RD"
            additional_price: { type: Number, default: 0 }
        },
        required: false,
        default: null
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
    // Added: explicit payment type for auditing (Cash, Credit, Split)
    payment_type: {
        type: String,
        enum: ['Cash','Credit','Split'],
        required: true,
        default: 'Cash'
    },
    // Credit tracking fields (nullable for pure cash sales)
    due_date: { type: Date }, // When credited amount should be settled
    allowed_until: { type: Date }, // Final deadline including grace period (due_date + allowed_delay_days)
    credit_total: { type: Number, min: 0, default: 0 }, // Original credit principal for this order
    credit_outstanding: { type: Number, min: 0, default: 0 }, // Remaining unpaid credit portion
    amount_paid_cash: { type: Number, min: 0, default: 0 }, // Cash collected at checkout
    amount_to_credit: { type: Number, min: 0, default: 0 }, // Portion moved to customer balance
    // Financial snapshot fields (for reporting independent of line item recalculations)
    subtotal_snapshot: { type: Number, min: 0, default: 0 },
    discount_total: { type: Number, min: 0, default: 0 },
    // tax_total intentionally omitted; not tracked in persistence as requested
    
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