const mongoose = require('mongoose');


// this is just for now
const TaxRateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide tax rate name'],
        trim: true,
        unique: true
    },
    rate: {
        type: Number,
        required: [true, 'Please provide tax rate percentage'],
        min: [0, 'Tax rate cannot be negative']
    }
}, { _id: false });

const SystemSettingsSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: 'GLOBAL_CONFIG'
    },
    default_currency: {
        type: String,
        required: [true, 'Default currency is required'],
        trim: true,
        uppercase: true,
        default: 'USD'
    },
    inventory_costing_method: {
        type: String,
        required: true,
        enum: ['FIFO', 'LIFO', 'WAC'], 
        default: 'WAC'
    },
    
    tax_rates: [TaxRateSchema]
    
}, {
    timestamps: true,
    versionKey: false 
});

module.exports = mongoose.model('SystemSettings', SystemSettingsSchema);