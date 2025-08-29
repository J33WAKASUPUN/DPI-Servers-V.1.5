const Booking = require('../model/Booking');
const Ticket = require('../model/Ticket');
const Passenger = require('../model/Passenger');

class AnalyticsService {
  // Get passenger dashboard analytics
  static async getPassengerDashboard(passengerId) {
    try {
      const passenger = await Passenger.findOne({ citizenId: passengerId });
      
      if (!passenger) {
        throw new Error('Passenger not found');
      }

      // Current month stats
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      // Get current month bookings
      const monthlyBookings = await Booking.find({
        passengerId,
        createdAt: { $gte: currentMonth, $lt: nextMonth }
      });

      // Get active tickets
      const activeTickets = await Ticket.find({
        passengerId,
        status: 'active',
        validUntil: { $gte: new Date() }
      });

      // Get recent bookings
      const recentBookings = await Booking.find({
        passengerId
      }).sort({ createdAt: -1 }).limit(5);

      // Calculate statistics
      const stats = {
        totalJourneys: passenger.totalJourneys || 0,
        monthlyJourneys: monthlyBookings.length,
        totalSpent: passenger.totalSpent || 0,
        monthlySpent: monthlyBookings.reduce((sum, booking) => sum + booking.pricing.totalAmount, 0),
        activeTickets: activeTickets.length,
        favoriteRoutes: passenger.preferences?.favoriteRoutes?.length || 0,
        avgJourneyRating: await this.calculateAverageRating(passengerId),
        carbonFootprintSaved: this.calculateCarbonSavings(passenger.totalJourneys || 0)
      };

      // Get route usage analytics
      const routeUsage = await this.getRouteUsageAnalytics(passengerId);

      // Get spending analytics
      const spendingAnalytics = await this.getSpendingAnalytics(passengerId);

      return {
        passenger: {
          id: passenger.citizenId,
          name: passenger.fullName,
          memberSince: passenger.createdAt,
          status: passenger.status
        },
        stats,
        recentBookings: recentBookings.map(booking => ({
          bookingId: booking.bookingId,
          routeName: booking.routeDetails.routeName,
          departureTime: booking.bookingDetails.departureTime,
          amount: booking.pricing.totalAmount,
          status: booking.status
        })),
        activeTickets: activeTickets.map(ticket => ({
          ticketId: ticket.ticketId,
          routeName: ticket.ticketDetails.routeName,
          departureTime: ticket.ticketDetails.departureTime,
          seatNumber: ticket.ticketDetails.seatNumber,
          validUntil: ticket.validUntil
        })),
        routeUsage,
        spendingAnalytics
      };

    } catch (error) {
      console.error('Passenger dashboard analytics error:', error);
      throw error;
    }
  }

  // Get route usage analytics
  static async getRouteUsageAnalytics(passengerId) {
    try {
      const routeUsage = await Booking.aggregate([
        { $match: { passengerId, status: { $in: ['completed', 'confirmed'] } } },
        {
          $group: {
            _id: '$routeDetails.routeId',
            routeName: { $first: '$routeDetails.routeName' },
            count: { $sum: 1 },
            totalSpent: { $sum: '$pricing.totalAmount' },
            lastUsed: { $max: '$bookingDetails.departureTime' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      return routeUsage.map(route => ({
        routeId: route._id,
        routeName: route.routeName,
        usageCount: route.count,
        totalSpent: route.totalSpent,
        lastUsed: route.lastUsed,
        avgCostPerTrip: Math.round(route.totalSpent / route.count)
      }));

    } catch (error) {
      console.error('Route usage analytics error:', error);
      return [];
    }
  }

  // Get spending analytics
  static async getSpendingAnalytics(passengerId) {
    try {
      // Last 6 months spending
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlySpending = await Booking.aggregate([
        {
          $match: {
            passengerId,
            status: { $in: ['completed', 'confirmed'] },
            createdAt: { $gte: sixMonthsAgo }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            totalSpent: { $sum: '$pricing.totalAmount' },
            tripCount: { $sum: 1 },
            avgFare: { $avg: '$pricing.totalAmount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      // Payment method breakdown
      const paymentMethodBreakdown = await Booking.aggregate([
        {
          $match: {
            passengerId,
            status: { $in: ['completed', 'confirmed'] }
          }
        },
        {
          $group: {
            _id: '$paymentDetails.paymentMethod',
            count: { $sum: 1 },
            totalAmount: { $sum: '$pricing.totalAmount' }
          }
        }
      ]);

      return {
        monthlySpending: monthlySpending.map(month => ({
          year: month._id.year,
          month: month._id.month,
          totalSpent: month.totalSpent,
          tripCount: month.tripCount,
          avgFare: Math.round(month.avgFare)
        })),
        paymentMethodBreakdown: paymentMethodBreakdown.map(method => ({
          method: method._id,
          count: method.count,
          totalAmount: method.totalAmount,
          percentage: 0 // Will be calculated in frontend
        }))
      };

    } catch (error) {
      console.error('Spending analytics error:', error);
      return { monthlySpending: [], paymentMethodBreakdown: [] };
    }
  }

  // Calculate average rating
  static async calculateAverageRating(passengerId) {
    try {
      // This would integrate with a rating system
      // For now, return a mock value
      return 4.2;
    } catch (error) {
      return 0;
    }
  }

  // Calculate carbon footprint savings
  static calculateCarbonSavings(totalJourneys) {
    // Estimated CO2 savings per bus journey vs private car (in kg)
    const co2SavedPerJourney = 2.3; // kg of CO2
    return Math.round(totalJourneys * co2SavedPerJourney * 10) / 10; // Round to 1 decimal
  }

  // Get travel history with analytics
  static async getTravelHistory(passengerId, options = {}) {
    try {
      const { page = 1, limit = 20, startDate, endDate, routeId } = options;

      const query = { passengerId };
      
      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      if (routeId) {
        query['routeDetails.routeId'] = routeId;
      }

      const bookings = await Booking.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('tickets'); // Assuming virtual populate

      const total = await Booking.countDocuments(query);

      // Calculate summary statistics
      const summary = await Booking.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalTrips: { $sum: 1 },
            totalSpent: { $sum: '$pricing.totalAmount' },
            avgFare: { $avg: '$pricing.totalAmount' },
            uniqueRoutes: { $addToSet: '$routeDetails.routeId' }
          }
        }
      ]);

      const summaryStats = summary[0] || {
        totalTrips: 0,
        totalSpent: 0,
        avgFare: 0,
        uniqueRoutes: []
      };

      return {
        bookings: bookings.map(booking => ({
          bookingId: booking.bookingId,
          routeName: booking.routeDetails.routeName,
          startLocation: booking.routeDetails.startLocation.name,
          endLocation: booking.routeDetails.endLocation.name,
          departureTime: booking.bookingDetails.departureTime,
          amount: booking.pricing.totalAmount,
          status: booking.status,
          createdAt: booking.createdAt,
          paymentMethod: booking.paymentDetails.paymentMethod
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          totalTrips: summaryStats.totalTrips,
          totalSpent: summaryStats.totalSpent,
          avgFare: Math.round(summaryStats.avgFare),
          uniqueRoutes: summaryStats.uniqueRoutes.length
        }
      };

    } catch (error) {
      console.error('Travel history analytics error:', error);
      throw error;
    }
  }

  // Get system-wide analytics (for admin)
  static async getSystemAnalytics() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);

      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      // Daily stats
      const todayStats = await this.getDayStats(today);
      const yesterdayStats = await this.getDayStats(yesterday);

      // Weekly stats
      const weeklyStats = await this.getPeriodStats(lastWeek, today);

      // Monthly stats
      const monthlyStats = await this.getPeriodStats(lastMonth, today);

      // Top routes
      const topRoutes = await Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: lastMonth },
            status: { $in: ['completed', 'confirmed'] }
          }
        },
        {
          $group: {
            _id: '$routeDetails.routeId',
            routeName: { $first: '$routeDetails.routeName' },
            bookings: { $sum: 1 },
            revenue: { $sum: '$pricing.totalAmount' }
          }
        },
        { $sort: { bookings: -1 } },
        { $limit: 10 }
      ]);

      return {
        overview: {
          today: todayStats,
          yesterday: yesterdayStats,
          growth: {
            bookings: this.calculateGrowth(todayStats.bookings, yesterdayStats.bookings),
            revenue: this.calculateGrowth(todayStats.revenue, yesterdayStats.revenue),
            passengers: this.calculateGrowth(todayStats.uniquePassengers, yesterdayStats.uniquePassengers)
          }
        },
        weekly: weeklyStats,
        monthly: monthlyStats,
        topRoutes
      };

    } catch (error) {
      console.error('System analytics error:', error);
      throw error;
    }
  }

  // Get stats for a specific day
  static async getDayStats(date) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const stats = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: date, $lt: nextDay }
        }
      },
      {
        $group: {
          _id: null,
          bookings: { $sum: 1 },
          revenue: { $sum: '$pricing.totalAmount' },
          uniquePassengers: { $addToSet: '$passengerId' }
        }
      }
    ]);

    const result = stats[0] || { bookings: 0, revenue: 0, uniquePassengers: [] };
    return {
      bookings: result.bookings,
      revenue: result.revenue,
      uniquePassengers: result.uniquePassengers.length
    };
  }

  // Get stats for a period
  static async getPeriodStats(startDate, endDate) {
    const stats = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          status: { $in: ['completed', 'confirmed'] }
        }
      },
      {
        $group: {
          _id: null,
          bookings: { $sum: 1 },
          revenue: { $sum: '$pricing.totalAmount' },
          uniquePassengers: { $addToSet: '$passengerId' },
          avgFare: { $avg: '$pricing.totalAmount' }
        }
      }
    ]);

    const result = stats[0] || { bookings: 0, revenue: 0, uniquePassengers: [], avgFare: 0 };
    return {
      bookings: result.bookings,
      revenue: result.revenue,
      uniquePassengers: result.uniquePassengers.length,
      avgFare: Math.round(result.avgFare)
    };
  }

  // Calculate growth percentage
  static calculateGrowth(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }
}

module.exports = AnalyticsService;