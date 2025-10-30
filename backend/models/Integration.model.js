const mongoose = require('mongoose');

const IntegrationSchema = new mongoose.Schema({
    platform: {
        type: String,
        required: [true, 'Please provide the platform name'],
        trim: true,
        unique: true // e.g., 'Shopify', 'WooCommerce', 'POS_Terminal_1'
    },
    api_key_encrypted: {
        type: String,
        required: [true, 'API Key is required'],
        select: false // *** CRITICAL: Do not return by default in queries ***
    },
    api_secret_encrypted: {
        type: String,
        select: false // For platforms that use a key/secret pair (optional)
    },
    status: {
        type: String,
        required: true,
        enum: ['Active', 'Inactive', 'Error'],
        default: 'Inactive'
    },
    last_sync_at: {
        type: Date,
        default: null
    },
    sync_error: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});


module.exports = mongoose.model('Integration', IntegrationSchema);