const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  addReportUploadJob, 
  getJobStatus, 
  getQueueStats 
} = require('../controllers/queueController');

// POST /api/queue/report-upload
router.post('/report-upload', protect, addReportUploadJob);

// GET /api/queue/job/:jobId
router.get('/job/:jobId', protect, getJobStatus);

// GET /api/queue/stats
router.get('/stats', protect, getQueueStats);

module.exports = router; 