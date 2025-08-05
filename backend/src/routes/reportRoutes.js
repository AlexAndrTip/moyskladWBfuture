const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { uploadReport, deleteReport, getReportsStatus, getReportDetails, getReportDetalization, exportReportToMS, createServiceReceipts, createExpenseOrders, createIncomeOrders } = require('../controllers/reportController');

// POST /api/reports/upload
router.post('/upload', protect, uploadReport);

// DELETE /api/reports/:integrationLinkId/:reportId
router.delete('/:integrationLinkId/:reportId', protect, deleteReport);

// GET /api/reports/status/:integrationLinkId
router.get('/status/:integrationLinkId', protect, getReportsStatus);

// GET /api/reports/details/:reportId
router.get('/details/:reportId', protect, getReportDetails);

// GET /api/reports/detalization/:reportId
router.get('/detalization/:reportId', protect, getReportDetalization);

// POST /api/reports/export-ms
router.post('/export-ms', protect, exportReportToMS);

// POST /api/reports/service-receipts
router.post('/service-receipts', protect, createServiceReceipts);

// POST /api/reports/expense-orders
router.post('/expense-orders', protect, createExpenseOrders);

// POST /api/reports/income-orders
router.post('/income-orders', protect, createIncomeOrders);

module.exports = router; 