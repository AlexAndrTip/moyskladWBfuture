// backend/src/routes/wbCabinetRoutes.js
const express = require('express');
const { getWbCabinets, createWbCabinet, updateWbCabinet, deleteWbCabinet } = require('../controllers/wbCabinetController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
  .get(protect, getWbCabinets)
  .post(protect, createWbCabinet);

router.route('/:id')
  .put(protect, updateWbCabinet)
  .delete(protect, deleteWbCabinet);

module.exports = router;
