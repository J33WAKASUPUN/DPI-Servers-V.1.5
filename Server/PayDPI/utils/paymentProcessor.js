const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class PaymentProcessor {
  // Process payment through Stripe
  static async processPayment(paymentData) {
    try {
      const { 
        amount, 
        currency, 
        paymentMethod, 
        paymentDetails, 
        transactionId,
        metadata 
      } = paymentData;
      
      console.log(`💳 Processing ${paymentMethod} payment: ${amount} ${currency}`);
      
      if (paymentMethod === 'stripe') {
        return await this.processStripePayment({
          amount: Math.round(amount * 100), // Convert to cents
          currency: currency.toLowerCase(),
          paymentMethodId: paymentDetails.paymentMethodId,
          transactionId,
          metadata
        });
      }
      
      if (paymentMethod === 'digital_wallet') {
        return await this.processDigitalWalletPayment(paymentData);
      }
      
      if (paymentMethod === 'bank_transfer') {
        return await this.processBankTransfer(paymentData);
      }
      
      throw new Error(`Unsupported payment method: ${paymentMethod}`);
      
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Process Stripe payment
  static async processStripePayment(stripeData) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: stripeData.amount,
        currency: stripeData.currency,
        payment_method: stripeData.paymentMethodId,
        confirmation_method: 'manual',
        confirm: true,
        metadata: {
          transactionId: stripeData.transactionId,
          journeyId: stripeData.metadata.journeyId,
          passengerId: stripeData.metadata.passengerId
        }
      });
      
      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          paymentIntentId: paymentIntent.id,
          chargeId: paymentIntent.charges.data[0]?.id,
          receiptUrl: paymentIntent.charges.data[0]?.receipt_url,
          status: 'completed'
        };
      } else if (paymentIntent.status === 'requires_action') {
        return {
          success: false,
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
          error: 'Payment requires additional authentication'
        };
      } else {
        return {
          success: false,
          error: `Payment failed with status: ${paymentIntent.status}`
        };
      }
      
    } catch (error) {
      console.error('Stripe payment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Process digital wallet payment (mock implementation)
  static async processDigitalWalletPayment(paymentData) {
    try {
      // Simulate digital wallet processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful payment
      const transactionId = `dw_${Date.now()}`;
      
      return {
        success: true,
        transactionId,
        chargeId: transactionId,
        receiptUrl: `https://wallet.example.com/receipt/${transactionId}`,
        status: 'completed'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Process bank transfer (mock implementation)
  static async processBankTransfer(paymentData) {
    try {
      // Simulate bank transfer processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const transactionId = `bt_${Date.now()}`;
      
      return {
        success: true,
        transactionId,
        chargeId: transactionId,
        receiptUrl: `https://bank.example.com/receipt/${transactionId}`,
        status: 'completed'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Create refund
  static async createRefund(refundData) {
    try {
      const { chargeId, amount, reason } = refundData;
      
      if (chargeId.startsWith('ch_')) {
        // Stripe refund
        const refund = await stripe.refunds.create({
          charge: chargeId,
          amount: Math.round(amount * 100), // Convert to cents
          reason: reason || 'requested_by_customer',
          metadata: {
            refund_reason: reason
          }
        });
        
        return {
          success: true,
          refundId: refund.id,
          status: refund.status,
          amount: refund.amount / 100
        };
      } else {
        // Mock refund for other payment methods
        return {
          success: true,
          refundId: `ref_${Date.now()}`,
          status: 'succeeded',
          amount
        };
      }
      
    } catch (error) {
      console.error('Refund processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Get payment status
  static async getPaymentStatus(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return {
        success: true,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = {
  processPayment: PaymentProcessor.processPayment.bind(PaymentProcessor),
  createRefund: PaymentProcessor.createRefund.bind(PaymentProcessor),
  getPaymentStatus: PaymentProcessor.getPaymentStatus.bind(PaymentProcessor)
};