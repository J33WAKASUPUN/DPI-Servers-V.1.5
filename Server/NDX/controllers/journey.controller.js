const Journey = require('../models/Journey');
const Schedule = require('../models/Schedule');
const Route = require('../models/Route');
const { calculateDistance } = require('../utils/gpsUtils');

class JourneyController {
  // Book a journey
  static async bookJourney(req, res) {
    try {
      const { scheduleId, startLocation, endLocation, fare, seatNumber } = req.body;
      
      let passengerId = 'anonymous';
      
      // Try to get citizenId from req.citizen (set by auth middleware)
      if (req.citizen && req.citizen.citizenId && req.citizen.citizenId !== 'anonymous') {
        passengerId = req.citizen.citizenId;
      } 
      // Check if manual extraction from token is needed
      else if (req.headers.authorization) {
        try {
          const token = req.headers.authorization.startsWith('Bearer ') 
            ? req.headers.authorization.substring(7) 
            : req.headers.authorization;
          
          const tokenParts = token.split('.');
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          if (payload && payload.citizenId) {
            passengerId = payload.citizenId;
            console.log('✅ citizenId manually extracted from token:', passengerId);
          }
        } catch (e) {
          console.error('Failed to manually extract citizenId:', e);
        }
      }
      
      // For development/testing, allow override
      if (req.body.passengerId) {
        passengerId = req.body.passengerId;
        console.log('⚠️ Using passengerId from request body:', passengerId);
      }
      
      console.log('🧍 Creating journey with passengerId:', passengerId);
      
      const journey = new Journey({
        scheduleId,
        passengerId, // Use the extracted/fallback ID
        routeDetails: {
          startLocation,
          endLocation
        },
        startTime: new Date(),
        fare,
        seatNumber,
        status: 'booked'
      });

      await journey.save();

      res.status(201).json({
        success: true,
        message: 'Journey booked successfully',
        data: journey
      });
    } catch (error) {
      console.error('Book journey error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to book journey',
        error: error.message
      });
    }
  }

  // Get passenger journeys
  static async getPassengerJourneys(req, res) {
    try {
      const journeys = await Journey.find({ 
        passengerId: req.citizen.citizenId 
      })
      .populate('scheduleId')
      .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: journeys
      });
    } catch (error) {
      console.error('Get passenger journeys error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get journeys',
        error: error.message
      });
    }
  }

  // Get journey details
  static async getJourneyDetails(req, res) {
    try {
      const { journeyId } = req.params;
      
      const journey = await Journey.findById(journeyId)
        .populate('scheduleId')
        .populate('routeDetails.routeId');

      if (!journey) {
        return res.status(404).json({
          success: false,
          message: 'Journey not found'
        });
      }

      res.json({
        success: true,
        data: journey
      });
    } catch (error) {
      console.error('Get journey details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get journey details',
        error: error.message
      });
    }
  }

  // Cancel journey
  static async cancelJourney(req, res) {
    try {
      const { journeyId } = req.params;
      
      const journey = await Journey.findByIdAndUpdate(
        journeyId,
        { status: 'cancelled' },
        { new: true }
      );

      if (!journey) {
        return res.status(404).json({
          success: false,
          message: 'Journey not found'
        });
      }

      res.json({
        success: true,
        message: 'Journey cancelled successfully',
        data: journey
      });
    } catch (error) {
      console.error('Cancel journey error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel journey',
        error: error.message
      });
    }
  }

  // Verify journey (for drivers)
  static async verifyJourney(req, res) {
    try {
      const { journeyId } = req.params;
      
      const journey = await Journey.findByIdAndUpdate(
        journeyId,
        { 
          isVerified: true,
          verifiedBy: req.citizen.citizenId,
          verifiedAt: new Date()
        },
        { new: true }
      );

      if (!journey) {
        return res.status(404).json({
          success: false,
          message: 'Journey not found'
        });
      }

      res.json({
        success: true,
        message: 'Journey verified successfully',
        data: journey
      });
    } catch (error) {
      console.error('Verify journey error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify journey',
        error: error.message
      });
    }
  }

  // Initiate payment (placeholder for PayDPI integration)
  static async initiatePayment(req, res) {
    try {
      const { journeyId } = req.params;
      
      // This would integrate with PayDPI server
      const journey = await Journey.findByIdAndUpdate(
        journeyId,
        { paymentStatus: 'paid' },
        { new: true }
      );

      res.json({
        success: true,
        message: 'Payment initiated successfully',
        data: journey
      });
    } catch (error) {
      console.error('Initiate payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate payment',
        error: error.message
      });
    }
  }

  // Track driver location
  static async trackDriverLocation(req, res) {
    try {
      const { journeyId } = req.params;
      const { latitude, longitude } = req.body;

      // Update journey status and location tracking
      const journey = await Journey.findByIdAndUpdate(
        journeyId,
        { status: 'in-progress' },
        { new: true }
      );

      res.json({
        success: true,
        message: 'Location tracked successfully',
        data: journey
      });
    } catch (error) {
      console.error('Track location error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track location',
        error: error.message
      });
    }
  }
}

module.exports = JourneyController;