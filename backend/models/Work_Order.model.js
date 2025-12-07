const mongoose = require('mongoose');

const ComponentSnapshotSchema = new mongoose.Schema({
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
    quantity_per_unit: {
        type: Number,
        required: [true, 'Please provide quantity needed per finished unit'],
        min: [1, 'Component quantity must be at least 1']
    },
    total_quantity_required: {
        type: Number,
        required: [true, 'Please provide total quantity required for the job'],
        min: [1, 'Total quantity must be at least 1']
    }
});

const WorkOrderSchema = new mongoose.Schema({
    wo_number: {
        type: String,
        required: [true, 'Please provide a work order number'],
        unique: true,
        trim: true,
        index: true
    },
    finished_good_product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Please specify the finished good to produce']
    },
    quantity_to_produce: {
        type: Number,
        required: [true, 'Please provide the quantity to produce'],
        min: [1, 'Quantity to produce must be at least 1']
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    component_source_location_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryLocation',
        required: [true, 'Please specify a source location for components']
    },
    output_location_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryLocation',
        required: [true, 'Please specify an output location for finished goods']
    },
    
    components: [ComponentSnapshotSchema],
    
    completed_at: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

WorkOrderSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === 'Completed') {
        this.completed_at = Date.now();
    }
    next();
});

module.exports = mongoose.model('WorkOrder', WorkOrderSchema);