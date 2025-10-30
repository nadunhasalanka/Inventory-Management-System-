const mongoose = require('mongoose');

const ChangeDetailSchema = new mongoose.Schema({
    field: {
        type: String,
        required: true
    },
    old_value: {
        type: mongoose.Schema.Types.Mixed // Allows storing any data type
    },
    new_value: {
        type: mongoose.Schema.Types.Mixed
    }
}, { _id: false });

const AuditLogSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'CREATE',
            'UPDATE',
            'DELETE',
            'LOGIN',
            'LOGOUT',
            'SECURITY'
        ]
    },
    collection_name: {
        type: String,
        required: true,
        trim: true
    },
    document_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    
    changes: [ChangeDetailSchema],
    
    ip_address: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);