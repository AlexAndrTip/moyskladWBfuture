const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getSettings, updateSettings, getAllUserSettings } = require('../controllers/settingsController');

// @route   GET /api/settings
// @access  Private
router.get('/', protect, getAllUserSettings);

// @route   GET /api/settings/:integrationLinkId
// @access  Private
router.get('/:integrationLinkId', protect, getSettings);

// @route   PUT /api/settings/:integrationLinkId
// @access  Private
router.put('/:integrationLinkId', protect, updateSettings);

module.exports = router; 