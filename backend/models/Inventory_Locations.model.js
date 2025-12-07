const mongoose = require('mongoose');

const InventoryLocationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a location name'],
        trim: true,
        unique: true
    },
    type: {
        type: String,
        required: [true, 'Please provide a location type'],
        enum: ['Warehouse', 'Store'],
        default: 'Warehouse'
    },
    address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        postal_code: { type: String, trim: true },
    }
}, {
    timeseries: true
});

module.exports = mongoose.model('InventoryLocation', InventoryLocationSchema);