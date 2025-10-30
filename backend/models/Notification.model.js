const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true, // The user who should receive the notification
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            'Low Stock', 
            'Expiry', 
            'Order Status', 
            'System',
            'Return Request'
        ]
    },
    message: {
        type: String,
        required: [true, 'Please provide a notification message'],
        trim: true
    },
    is_read: {
        type: Boolean,
        default: false,
        index: true // Allows users to quickly query for unread notifications
    },

    related_entity_type: {
        type: String,
        enum: ['Product', 'SalesOrder', 'PurchaseOrder', 'Customer', 'ReturnsExchange']
    },
    related_entity_id: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'related_entity_type' // Points to the collection in 'related_entity_type'
    }
}, {
    timestamps: true // 'createdAt' is very useful for sorting notifications
});

module.exports = mongoose.model('Notification', NotificationSchema);