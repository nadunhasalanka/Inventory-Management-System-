const mongoose = require('mongoose');

const POLineItemSnapshotSchema = new mongoose.Schema({
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
    quantity_ordered: {
        type: Number,
        required: [true, 'Please provide quantity ordered'],
        min: [1, 'Quantity must be at least 1']
    },
    unit_cost: {
        type: Number,
        required: [true, 'Please provide a unit cost'],
        min: [0, 'Unit cost cannot be negative']
    },
    total_cost: {
        type: Number,
        required: true,
        min: [0, 'Total cost cannot be negative']
    }
});

const ReceivedItemSchema = new mongoose.Schema({
    line_item_id: { // The _id of the item in the line_items array above
        type: mongoose.Schema.Types.ObjectId, 
        required: true 
    },
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity_received: {
        type: Number,
        required: true,
        min: [0, 'Received quantity cannot be negative']
    }
}, { _id: false });


// Represents one shipment/delivery against this PO
const GRNSchema = new mongoose.Schema({
    grn_number: { 
        type: String, 
        required: true, 
        trim: true, 
        unique: true 
    },
    received_date: { 
        type: Date, 
        default: Date.now 
    },
    location_id: { // The warehouse/bin where stock was added
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryLocation',
        required: true
    },
    inspected_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    items: [ReceivedItemSchema]
}, { timestamps: true });

const InvoiceDetailsSchema = new mongoose.Schema({
    invoice_number: { 
        type: String, 
        required: true, 
        trim: true 
    },
    invoice_date: { 
        type: Date, 
        required: true 
    },
    invoice_amount: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    payment_status: {
        type: String,
        enum: ['Pending', 'Paid', 'Partially Paid'],
        default: 'Pending'
    },
    payment_ids: [{ // Link to records in the 'payments' collection
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    }]
}, { _id: false });


const PurchaseOrderSchema = new mongoose.Schema({
    po_number: {
        type: String,
        required: [true, 'Please provide a PO number'],
        unique: true,
        trim: true,
        index: true
    },
    supplier_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },
    order_date: {
        type: Date,
        default: Date.now
    },
    expected_delivery_date: {
        type: Date
    },
    status: {
        type: String,
        required: true,
        enum: ['Draft', 'Sent', 'Partially Received', 'Received', 'Cancelled'],
        default: 'Draft'
    },
    
    line_items: [POLineItemSnapshotSchema],
    
    goods_receipts: [GRNSchema],
    
    invoice_details: InvoiceDetailsSchema
    
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

PurchaseOrderSchema.virtual('grand_total').get(function() {
    if (this.line_items.length === 0) {
        return 0;
    }
    return this.line_items.reduce((total, item) => total + item.total_cost, 0);
});

module.exports = mongoose.model('PurchaseOrder', PurchaseOrderSchema);