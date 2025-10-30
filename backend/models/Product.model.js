const mongoose = require('mongoose');


const VariantSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Please provide variant name'], 
        trim: true 
    }, // e.g., "Color", "Size"
    value: { 
        type: String, 
        required: [true, 'Please provide variant value'], 
        trim: true 
    }, // e.g., "Red", "Large"
    sku_suffix: { 
        type: String, 
        trim: true 
    }, // e.g., "-RD-LG"
    additional_price: { 
        type: Number, 
        default: 0 
    }
});

const BundleComponentSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Bundle quantity must be at least 1'],
        default: 1
    }
});

const DigitalAssetSchema = new mongoose.Schema({
    url: { 
        type: String, 
        required: true 
    },
    type: { 
        type: String, 
        enum: ['Image', 'Manual', 'Certification'], 
        default: 'Image' 
    },
    alt_text: { 
        type: String, 
        trim: true 
    }
});

const ProductSchema = new mongoose.Schema({
    sku: {
        type: String,
        required: [true, 'Please provide a SKU'],
        unique: true,
        trim: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Please provide a product name'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Please assign a category']
    },
    unit_cost: {
        type: Number,
        required: [true, 'Please provide a unit cost'],
        min: [0, 'Unit cost cannot be negative'],
        default: 0
    },
    selling_price: {
        type: Number,
        required: [true, 'Please provide a selling price'],
        min: [0, 'Selling price cannot be negative'],
        default: 0
    },
    reorder_point: {
        type: Number,
        min: [0, 'Reorder point cannot be negative'],
        default: 0
    },
    lead_time_days: {
        type: Number,
        min: [0, 'Lead time cannot be negative'],
        default: 0
    },
    is_active: {
        type: Boolean,
        default: true
    },
    allow_returns: {
        type: Boolean,
        default: true
    },

    variants: [VariantSchema],
    
    bundles: [BundleComponentSchema],
    
    tags: [{ 
        type: String, 
        trim: true, 
        lowercase: true 
    }],
    
    assets: [DigitalAssetSchema]

}, {
    timestamps: true,
    toJSON: { virtuals: true }, 
    toObject: { virtuals: true } 
});

ProductSchema.pre('save', function (next) {
    if (this.isModified('selling_price') || this.isModified('unit_cost')) {
        if (this.selling_price < this.unit_cost) {
            return next(new Error('Selling price cannot be less than unit cost.'));
        }
    }
    next();
});

ProductSchema.virtual('profit_margin').get(function() {
    if (this.selling_price === 0) {
        return 0;
    }
    return ((this.selling_price - this.unit_cost) / this.selling_price) * 100;
});

module.exports = mongoose.model('Product', ProductSchema);