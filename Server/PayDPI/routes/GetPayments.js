const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/PaymentsFromPassengerServer');
const { verifyToken, authorize } = require('../middleware/auth');
const PayDPIProcessor = require('../utils/payDPIProcessor');

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

// PayDPI callback route
router.get('/paydpi/callback', async (req, res) => {
  try {
    const { resultIndicator, orderId } = req.query;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }
    
    // Verify payment with PayDPI
    const payDPIProcessor = new PayDPIProcessor();
    const verificationResult = await payDPIProcessor.verifyPayment(orderId);
    
    if (verificationResult.success) {
      // Find and update transaction
      const Transaction = require('../models/Transaction');
      const transaction = await Transaction.findOne({ 
        payDPIOrderId: orderId 
      });
      
      if (transaction) {
        if (verificationResult.status === 'CAPTURED') {
          transaction.status = 'completed';
          transaction.payDPIPaymentStatus = 'payment_completed';
          transaction.chargeId = verificationResult.transactionId;
          await transaction.save();
          
          // Redirect to success page
          res.redirect(`${process.env.FRONTEND_URL}/payment/success?transactionId=${transaction.transactionId}`);
        } else {
          transaction.status = 'failed';
          transaction.payDPIPaymentStatus = 'payment_failed';
          transaction.failureReason = 'Payment not captured';
          await transaction.save();
          
          // Redirect to failure page
          res.redirect(`${process.env.FRONTEND_URL}/payment/failed?transactionId=${transaction.transactionId}`);
        }
      } else {
        res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        error: verificationResult.error
      });
    }
    
  } catch (error) {
    console.error('PayDPI callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment callback processing failed',
      error: error.message
    });
  }
});

// PayDPI session creation route
router.post('/paydpi/create-session', verifyToken, async (req, res) => {
  try {
    const { amount, journeyId, metadata } = req.body;
    const passengerId = req.citizen.citizenId;
    
    const payDPIProcessor = new PayDPIProcessor();
    const orderId = `ORDER_${journeyId}_${Date.now()}`;
    
    const sessionResult = await payDPIProcessor.createPaymentSession({
      orderId,
      amount,
      description: `Transport Payment - Journey ${journeyId}`
    });
    
    if (sessionResult.success) {
      res.json({
        success: true,
        data: {
          sessionId: sessionResult.sessionId,
          checkoutUrl: sessionResult.checkoutUrl,
          orderId: orderId
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to create PayDPI session',
        error: sessionResult.error
      });
    }
    
  } catch (error) {
    console.error('PayDPI session creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create PayDPI session',
      error: error.message
    });
  }
});

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