const mongoose = require('mongoose');

const BatchLotSchema = new mongoose.Schema({
    batch_number: {
        type: String,
        required: [true, 'Batch number is required'],
        trim: true
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity for this batch is required'],
        min: [0, 'Batch quantity cannot be negative']
    }, 
    expire_date: {
        type: Date,
        default: Date.now
    }
});

const InventoryStockSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    location_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryLocation',
        required: true
    },
    current_quantity: {
        type: Number,
        required: true,
        min: [0, 'Current quantity cannot be negative'],
        default: 0
    },
    min_stock_level: {
        type: Number,
        min: [0, 'Min stocj level cannot be negative'],
        default: 0
    },
    max_stock_level: {
        type: Number,
        min: [0, 'Max stocl level cannot be negative'],
        default: 0
    }, 

    batches: [BatchLotSchema],

    serial_numbers: [{
        type: String,
        trim: true
    }]
}, {
    timeseries: true
});

InventoryStockSchema.index({
    product_id: 1,
    location_id: 1,
},{
    unique: true
}); 


// validate if current_quantity matches the sum of batches
InventoryStockSchema.virtual('total_batch_quantiry').get(function(){
    if(this.batches.length === 0){
        return 0;
    }

    return this.batches.reduce((total, batch) => total + batch.quantity, 0);
}); 

module.exports = mongoose.model('InventoryStock', InventoryStockSchema);
