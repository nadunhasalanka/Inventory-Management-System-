const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
    street: { 
        type: String, 
        trim: true 
    },
    city: { 
        type: String, 
        trim: true 
    },
    state: { 
        type: String, 
        trim: true 
    },
    postal_code: { 
        type: String, 
        trim: true 
    },
}, { _id: false });

const ContactInfoSchema = new mongoose.Schema({
    primary_contact_name: { 
        type: String, 
        trim: true 
    },
    email: {
        type: String,
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address'
        ],
        lowercase: true
    },
    phone: { 
        type: String, 
        trim: true 
    }
}, { _id: false });

const SupplierSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a supplier name'],
        trim: true,
        unique: true
    },
    contact_info: ContactInfoSchema,
    
    address: AddressSchema,
    
    terms: {
        type: String,
        trim: true,
        default: 'N/A'
    },
    
    performance_metrics: {
        type: mongoose.Schema.Types.Mixed,
        default: {} 
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Supplier', SupplierSchema);