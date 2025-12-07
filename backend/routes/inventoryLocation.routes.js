const express = require('express');
const {
    createLocation,
    getLocations,
    getLocationById,
    updateLocation,
    deleteLocation
} = require('../controllers/inventoryLocation.controller');

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// @route   POST /api/locations
// @route   GET  /api/locations
router.route('/')
    .post(protect, authorize('Admin', 'Manager'), createLocation)
    .get(protect, getLocations);

// @route   GET    /api/locations/:id
// @route   PUT    /api/locations/:id
// @route   DELETE /api/locations/:id
router.route('/:id')
    .get(protect, getLocationById)
    .put(protect, authorize('Admin', 'Manager'), updateLocation)
    .delete(protect, authorize('Admin'), deleteLocation);

module.exports = router;