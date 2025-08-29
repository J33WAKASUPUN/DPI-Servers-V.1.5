const apiGateway = require('../config/apiGateway');

class PayDPIService {
  // Process booking payment
  static async processBookingPayment(paymentData, token) {
    try {
      console.log('💳 Processing booking payment through PayDPI...');
      
      const response = await apiGateway.processPaymentWithPayDPI({
        journeyId: paymentData.bookingId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        paymentDetails: paymentData.paymentDetails,
        applySubsidy: paymentData.applySubsidy || false,
        metadata: {
          bookingId: paymentData.bookingId,
          passengerId: paymentData.passengerId,
          routeName: paymentData.routeName,
          scheduleId: paymentData.scheduleId,
          type: 'booking_payment'
        }
      }, token);

      return response;
    } catch (error) {
      console.error('PayDPI booking payment error:', error);
      throw error;
    }
  }

  // Process refund
  static async processRefund(refundData, token) {
    try {
      console.log('💰 Processing refund through PayDPI...');
      
      const response = await apiGateway.processPaymentWithPayDPI({
        action: 'refund',
        transactionId: refundData.transactionId,
        amount: refundData.amount,
        reason: refundData.reason,
        metadata: {
          bookingId: refundData.bookingId,
          type: 'booking_refund'
        }
      }, token);

      return response;
    } catch (error) {
      console.error('PayDPI refund error:', error);
      throw error;
    }
  }

  // Get payment status
  static async getPaymentStatus(transactionId, token) {
    try {
      const response = await apiGateway.getFromPayDPI(`/transaction/${transactionId}`, token);
      return response;
    } catch (error) {
      console.error('PayDPI payment status error:', error);
      throw error;
    }
  }

  // Apply subsidy calculation
  static async calculateSubsidy(subsidyData, token) {
    try {
      const response = await apiGateway.postToPayDPI('/subsidies/calculate', subsidyData, token);
      return response;
    } catch (error) {
      console.error('PayDPI subsidy calculation error:', error);
      throw error;
    }
  }

  // Get available payment methods
  static async getPaymentMethods(token) {
    try {
      const response = await apiGateway.getFromPayDPI('/methods', token);
      return response;
    } catch (error) {
      console.error('PayDPI payment methods error:', error);
      throw error;
    }
  }
}

module.exports = PayDPIService;