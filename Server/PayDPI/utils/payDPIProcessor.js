const fetch = require("node-fetch");

class PayDPIProcessor {
  constructor() {
    this.baseUrl = process.env.PAYDPI_BASE_URL;
    this.merchantId = process.env.PAYDPI_MERCHANT_ID;
    this.apiUsername = process.env.PAYDPI_API_USERNAME;
    this.apiPassword = process.env.PAYDPI_API_PASSWORD;
    this.apiVersion = process.env.PAYDPI_API_VERSION;
    this.credentials = Buffer.from(
      `${this.apiUsername}:${this.apiPassword}`
    ).toString("base64");
  }

  // Create PayDPI payment session (Hosted Checkout)
  async createPaymentSession(orderData) {
    try {
      const url = `${this.baseUrl}/api/rest/version/${this.apiVersion}/merchant/${this.merchantId}/session`;

      const requestBody = {
        apiOperation: "INITIATE_CHECKOUT",
        interaction: {
          merchant: {
            name: "ReviveNation Transport",
          },
          operation: "PURCHASE",
          displayControl: {
            billingAddress: "HIDE",
            customerEmail: "HIDE",
            shipping: "HIDE",
          },
          returnUrl: process.env.PAYDPI_CALLBACK_URL,
        },
        order: {
          id: orderData.orderId,
          currency: "LKR",
          description: orderData.description || "Transport Payment",
          amount: orderData.amount.toString(),
        },
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${this.credentials}`,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.result === "SUCCESS") {
        return {
          success: true,
          sessionId: result.session.id,
          checkoutUrl: `${this.baseUrl}/static/checkout/checkout.min.js`,
          orderId: orderData.orderId,
        };
      } else {
        throw new Error(
          result.error?.explanation || "Failed to create PayDPI session"
        );
      }
    } catch (error) {
      console.error("PayDPI session creation error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Verify payment status
  async verifyPayment(orderId) {
    try {
      const url = `${this.baseUrl}/api/rest/version/${this.apiVersion}/merchant/${this.merchantId}/order/${orderId}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Basic ${this.credentials}`,
        },
      });

      const result = await response.json();

      if (result.result === "SUCCESS") {
        return {
          success: true,
          status: result.order.status,
          amount: parseFloat(result.order.amount),
          currency: result.order.currency,
          transactionId: result.order.id,
          paymentDetails: result,
        };
      } else {
        return {
          success: false,
          error: "Payment verification failed",
        };
      }
    } catch (error) {
      console.error("PayDPI payment verification error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Process PayDPI payment
  // Process PayDPI payment
  async processPayDPIPayment(paymentData) {
    try {
      const { amount, transactionId, metadata } = paymentData;

      // Create shorter order ID for PayDPI (max 40 characters)
      const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
      const shortTransactionId = transactionId.replace(/-/g, "").slice(0, 20); // Remove hyphens, take first 20 chars
      const orderId = `ORD_${shortTransactionId}_${timestamp}`; // ~32 characters total

      console.log(
        `🏷️ Generated PayDPI Order ID: ${orderId} (Length: ${orderId.length})`
      );

      // Create payment session
      const sessionResult = await this.createPaymentSession({
        orderId,
        amount,
        description: `Transport Payment - Journey ${metadata.journeyId}`,
      });

      if (sessionResult.success) {
        return {
          success: true,
          sessionId: sessionResult.sessionId,
          checkoutUrl: sessionResult.checkoutUrl,
          orderId: orderId,
          status: "session_created",
          payDPISessionId: sessionResult.sessionId,
        };
      } else {
        return {
          success: false,
          error: sessionResult.error,
        };
      }
    } catch (error) {
      console.error("PayDPI payment processing error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = PayDPIProcessor;
