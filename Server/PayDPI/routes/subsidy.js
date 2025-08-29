const express = require('express');
const router = express.Router();
const Subsidy = require('../models/Subsidy');
const { verifyToken, authorize } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Apply authentication to all routes
router.use(verifyToken);

// Apply for subsidy
router.post('/apply', async (req, res) => {
  try {
    const citizenId = req.citizen.citizenId;
    const {
      subsidyType,
      amount,
      percentage,
      eligibilityPeriod,
      verificationDocuments
    } = req.body;
    
    // Check if citizen already has an active subsidy of this type
    const existingSubsidy = await Subsidy.findOne({
      citizenId,
      subsidyType,
      status: { $in: ['active', 'pending_verification'] }
    });
    
    if (existingSubsidy) {
      return res.status(400).json({
        success: false,
        message: `You already have an ${existingSubsidy.status} ${subsidyType} subsidy`
      });
    }
    
    const subsidy = new Subsidy({
      subsidyId: uuidv4(),
      citizenId,
      subsidyType,
      amount,
      percentage,
      eligibilityPeriod,
      verificationDocuments: verificationDocuments || [],
      status: 'pending_verification'
    });
    
    await subsidy.save();
    
    res.status(201).json({
      success: true,
      message: 'Subsidy application submitted successfully',
      data: subsidy
    });
    
  } catch (error) {
    console.error('Apply subsidy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply for subsidy',
      error: error.message
    });
  }
});

// Get citizen's subsidies
router.get('/my-subsidies', async (req, res) => {
  try {
    const citizenId = req.citizen.citizenId;
    
    const subsidies = await Subsidy.find({ citizenId })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: subsidies
    });
    
  } catch (error) {
    console.error('Get subsidies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subsidies',
      error: error.message
    });
  }
});

// Get active subsidies for a citizen
router.get('/active', async (req, res) => {
  try {
    const citizenId = req.citizen.citizenId;
    
    const activeSubsidies = await Subsidy.findActiveByCitizen(citizenId);
    
    res.json({
      success: true,
      data: activeSubsidies
    });
    
  } catch (error) {
    console.error('Get active subsidies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active subsidies',
      error: error.message
    });
  }
});

// Calculate subsidy for a fare amount
router.post('/calculate', async (req, res) => {
  try {
    const citizenId = req.citizen.citizenId;
    const { fareAmount } = req.body;
    
    if (!fareAmount || fareAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid fare amount is required'
      });
    }
    
    const activeSubsidies = await Subsidy.findActiveByCitizen(citizenId);
    
    let totalSubsidy = 0;
    const applicableSubsidies = [];
    
    for (const subsidy of activeSubsidies) {
      if (subsidy.canUseSubsidy()) {
        const subsidyAmount = subsidy.calculateSubsidy(fareAmount);
        totalSubsidy += subsidyAmount;
        
        applicableSubsidies.push({
          subsidyId: subsidy.subsidyId,
          subsidyType: subsidy.subsidyType,
          amount: subsidyAmount,
          percentage: subsidy.percentage
        });
      }
    }
    
    const finalAmount = Math.max(0, fareAmount - totalSubsidy);
    
    res.json({
      success: true,
      data: {
        originalAmount: fareAmount,
        totalSubsidy,
        finalAmount,
        savings: totalSubsidy,
        applicableSubsidies
      }
    });
    
  } catch (error) {
    console.error('Calculate subsidy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate subsidy',
      error: error.message
    });
  }
});

// Admin routes
router.get('/admin/pending', authorize(['admin']), async (req, res) => {
  try {
    const pendingSubsidies = await Subsidy.find({
      status: 'pending_verification'
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: pendingSubsidies
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get pending subsidies',
      error: error.message
    });
  }
});

router.post('/admin/:subsidyId/verify', authorize(['admin']), async (req, res) => {
  try {
    const { subsidyId } = req.params;
    const { status, notes } = req.body;
    const verifiedBy = req.citizen.citizenId;
    
    if (!['active', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either active or rejected'
      });
    }
    
    const subsidy = await Subsidy.findOne({ subsidyId });
    
    if (!subsidy) {
      return res.status(404).json({
        success: false,
        message: 'Subsidy not found'
      });
    }
    
    subsidy.status = status;
    subsidy.applicationDetails.verifiedBy = verifiedBy;
    subsidy.applicationDetails.verificationDate = new Date();
    subsidy.applicationDetails.notes = notes;
    
    await subsidy.save();
    
    res.json({
      success: true,
      message: `Subsidy ${status === 'active' ? 'approved' : 'rejected'} successfully`,
      data: subsidy
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify subsidy',
      error: error.message
    });
  }
});

module.exports = router;