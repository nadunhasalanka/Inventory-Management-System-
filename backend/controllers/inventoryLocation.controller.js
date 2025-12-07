const InventoryLocation = require('../models/Inventory_Locations.model');
const InventoryStock = require('../models/Inventory_Stock.model'); // For validation
const asyncHandler = require('../middleware/asyncHandler');

//  @route   POST /api/locations
exports.createLocation = asyncHandler(async (req, res, next) => {
    const { name } = req.body;

    const nameExists = await InventoryLocation.findOne({ name });
    if (nameExists) {
        return res.status(400).json({ success: false, message: `Location with name ${name} already exists` });
    }

    const location = await InventoryLocation.create(req.body);
    res.status(201).json({ success: true, data: location });
});

//  @route   GET /api/locations
exports.getLocations = asyncHandler(async (req, res, next) => {
    const locations = await InventoryLocation.find({});
    res.status(200).json({ success: true, count: locations.length, data: locations });
});

//  @route   GET /api/locations/:id
exports.getLocationById = asyncHandler(async (req, res, next) => {
    const location = await InventoryLocation.findById(req.params.id);

    if (!location) {
        return res.status(404).json({ success: false, message: `Location not found with ID ${req.params.id}` });
    }

    // (Later, you can populate this with stock items)
    res.status(200).json({ success: true, data: location });
});

//  @route   PUT /api/locations/:id
exports.updateLocation = asyncHandler(async (req, res, next) => {
    let location = await InventoryLocation.findById(req.params.id);

    if (!location) {
        return res.status(404).json({ success: false, message: `Location not found with ID ${req.params.id}` });
    }

    location = await InventoryLocation.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });
    res.status(200).json({ success: true, data: location });
});

//  @route   DELETE /api/locations/:id
exports.deleteLocation = asyncHandler(async (req, res, next) => {
    // Check if any stock exists in this location with a quantity > 0
    const stockInUse = await InventoryStock.findOne({ 
        location_id: req.params.id,
        current_quantity: { $gt: 0 } 
    });

    if (stockInUse) {
        return res.status(400).json({ 
            success: false, 
            message: 'Cannot delete location. It has active stock. Please transfer stock first.' 
        });
    }

    const location = await InventoryLocation.findById(req.params.id);
    if (!location) {
        return res.status(404).json({ success: false, message: `Location not found with ID ${req.params.id}` });
    }

    await location.deleteOne();

    res.status(200).json({ success: true, data: {} });
});