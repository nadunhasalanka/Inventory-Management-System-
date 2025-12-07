const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    entity_type: {
        type: String,
        required: true,
        enum: ['Customer', 'SalesOrder', 'PurchaseOrder']
    },
    entity_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    
    amount: {
        type: Number,
        required: [true, 'Please provide a payment amount'],
        min: [0, 'Payment amount cannot be negative']
    },
    type: {
        type: String,
        required: true,
        enum: ['Sale', 'Credit Payment', 'Refund', 'Supplier Payment'],
        // 'Sale' = Payment for a specific SO
        // 'Credit Payment' = Payment against a customer's total balance
        // 'Refund' = Money returned to a customer
        // 'Supplier Payment' = Money paid to a supplier for a PO
    },
    date: {
        type: Date,
        default: Date.now
    },
    method: {
        type: String,
        trim: true,
        default: 'N/A'
    },
    transaction_id: {
        type: String,
        trim: true,
        index: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Payment', PaymentSchema);