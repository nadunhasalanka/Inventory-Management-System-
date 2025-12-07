const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a customer name'],
        trim: true
    }, 
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address'
        ],
        lowecase: true
    },
    address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        postal_code: { type: String, trim: true }
    },
    credit_limit: {
        type: Number,
        min: [0, 'Credit limit cannot be nefative'],
        default: 0
    },
    current_balance: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Customer', CustomerSchema);