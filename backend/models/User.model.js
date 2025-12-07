const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please provide a username'],
        trim: true,
        unique: true,
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
        lowercase: true
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 6,
        select: false
    },
    role: {
        type: String,
        enum: ['Admin', 'Manager', 'WarehouseStaff', 'Staff'],
        default: 'Staff'
    },
    first_name: { type: String, trim: true },
    last_name: { type: String, trim: true },
    is_active: { type: Boolean, default: true },
    last_login_at: { type: Date },
    active_location_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryLocation',
        default: null
    },
    active_location_set_at: { type: Date },
}, { 
    timestamps: true 
});

UserSchema.pre('save', async function (next){
    if (!this.isModified('password')){
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    next();
});

UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
}

UserSchema.methods.getSignedJwtToken = function() {
    return jwt.sign(
        { id: this._id, role: this.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY }
    )
}

module.exports = mongoose.model('User', UserSchema);

