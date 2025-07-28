// backend/src/routes/integrationLinkRoutes.js
const express = require('express');
const { getIntegrationLinks, createIntegrationLink, deleteIntegrationLink, checkWbToken } = require('../controllers/integrationLinkController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
  .get(protect, getIntegrationLinks)
  .post(protect, createIntegrationLink);

router.route('/:id')
  .delete(protect, deleteIntegrationLink);

router.route('/:id/check-token')
  .get(protect, checkWbToken);

module.exports = router;
