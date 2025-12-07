const mongoose = require('mongoose');

// this is a simple snapshot if the product's price or name changes later.
// quatation remains accurate
const LineItemSnapshotSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        trim: true
    },
    sku: {
        type: Sting,
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
        min: [1, 'Quantity must at least be 1']
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

const QuotationSchema = new mongoose.Schema({
    quote_number: {
        type: String,
        required: [true, 'Please provide a quote number'],
        unique: true,
        trim: true,
        index: true
    },
    customer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    status: {
        type: String,
        enum: ['Draft', 'Sent', 'Accepted', 'Expired'],
        default: 'Draft'
    },
    expiry_date: {
        type: Date,
        required: [true, 'Please provide an expiry date']
    },

    line_items: [LineItemSnapshotSchema]

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// --- Virtual for grand total ---
QuotationSchema.virtual('grand_total').get(function() {
    if (this.line_items.length === 0) {
        return 0;
    }
    return this.line_items.reduce((total, item) => total + item.total_price, 0);
});

module.exports = mongoose.model('Quotation', QuotationSchema);