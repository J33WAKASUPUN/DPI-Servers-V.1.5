const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/PaymentsFromPassengerServer');
const { verifyToken, authorize } = require('../middleware/auth');

// Apply authentication to all routes
router.use(verifyToken);

// Payment processing
router.post('/process', PaymentController.processJourneyPayment);

// Payment history
router.get('/history', PaymentController.getPaymentHistory);

// Get specific transaction
router.get('/transaction/:transactionId', PaymentController.getTransaction);

// Process refund
router.post('/transaction/:transactionId/refund', PaymentController.processRefund);

// Get available payment methods
router.get('/methods', PaymentController.getPaymentMethods);

// Admin routes (require admin role)
router.get('/admin/all', authorize(['admin']), async (req, res) => {
  try {
    const Transaction = require('../models/Transaction');
    const { page = 1, limit = 20, status } = req.query;
    
    const query = {};
    if (status) query.status = status;
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const total = await Transaction.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions',
      error: error.message
    });
  }
});

module.exports = router;