const Transaction = require("../models/Transaction");
const Subsidy = require("../models/Subsidy");
const { v4: uuidv4 } = require("uuid");
const { processPayment, createRefund } = require("../utils/paymentProcessor");

class PaymentController {
  // Process journey payment
  static async processJourneyPayment(req, res) {
    try {
      const {
        journeyId,
        amount,
        paymentMethod,
        paymentDetails,
        applySubsidy = false,
        metadata,
      } = req.body;

      const passengerId = req.citizen.citizenId;

      console.log(
        `💳 Processing payment for journey ${journeyId}, passenger ${passengerId}`
      );

      let finalAmount = amount;
      let subsidyApplied = 0;

      // Apply subsidy if requested
      if (applySubsidy) {
        const activeSubsidies = await Subsidy.findActiveByCitizen(passengerId);

        for (const subsidy of activeSubsidies) {
          if (subsidy.canUseSubsidy()) {
            const subsidyAmount = subsidy.calculateSubsidy(finalAmount);
            subsidyApplied += subsidyAmount;
            finalAmount -= subsidyAmount;

            // Record subsidy usage
            await subsidy.recordUsage();
            console.log(
              `🎁 Applied subsidy: ${subsidyAmount} LKR for ${subsidy.subsidyType}`
            );
          }
        }
      }

      // Create transaction record
      const transaction = new Transaction({
        transactionId: uuidv4(),
        journeyId,
        passengerId,
        amount: finalAmount,
        paymentMethod,
        metadata: {
          ...metadata,
          originalAmount: amount,
          subsidyApplied,
        },
      });

      await transaction.save();

      // Process payment based on method
      let paymentResult;

      if (paymentMethod === "cash") {
        // Mark as completed for cash payments
        paymentResult = {
          success: true,
          transactionId: transaction.transactionId,
          status: "completed",
        };
        await transaction.markAsCompleted("cash_payment", null);
      } else if (paymentMethod === "paydpi") {
        // Process through PayDPI
        paymentResult = await processPayment({
          amount: finalAmount,
          currency: "LKR",
          paymentMethod,
          paymentDetails,
          transactionId: transaction.transactionId,
          metadata: {
            journeyId,
            passengerId,
          },
        });

        if (paymentResult.success) {
          // Update transaction with PayDPI details
          transaction.payDPISessionId = paymentResult.sessionId;
          transaction.payDPIOrderId = paymentResult.orderId;
          transaction.payDPIPaymentStatus = "session_created";
          await transaction.save();

          // Return session details for frontend to handle checkout
          return res.status(201).json({
            success: true,
            message: "PayDPI session created successfully",
            data: {
              transactionId: transaction.transactionId,
              paymentMethod: "paydpi",
              sessionId: paymentResult.sessionId,
              checkoutUrl: paymentResult.checkoutUrl,
              orderId: paymentResult.orderId,
              originalAmount: amount,
              subsidyApplied,
              finalAmount,
              status: "session_created",
            },
          });
        } else {
          await transaction.markAsFailed(paymentResult.error);
        }
      } else {
        // Process through other payment gateways (existing Stripe logic)
        paymentResult = await processPayment({
          amount: finalAmount,
          currency: "LKR",
          paymentMethod,
          paymentDetails,
          transactionId: transaction.transactionId,
          metadata: {
            journeyId,
            passengerId,
          },
        });

        if (paymentResult.success) {
          await transaction.markAsCompleted(
            paymentResult.chargeId,
            paymentResult.receiptUrl
          );
        } else {
          await transaction.markAsFailed(paymentResult.error);
        }
      }

      res.status(201).json({
        success: true,
        message: "Payment processed successfully",
        data: {
          transactionId: transaction.transactionId,
          originalAmount: amount,
          subsidyApplied,
          finalAmount,
          status: paymentResult.success ? "completed" : "failed",
          paymentMethod,
          receiptUrl: paymentResult.receiptUrl,
          paymentResult,
        },
      });
    } catch (error) {
      console.error("Payment processing error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process payment",
        error: error.message,
      });
    }
  }

  // Get payment history for passenger
  static async getPaymentHistory(req, res) {
    try {
      const passengerId = req.citizen.citizenId;
      const { page = 1, limit = 10, status } = req.query;

      const query = { passengerId };
      if (status) {
        query.status = status;
      }

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
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get payment history error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get payment history",
        error: error.message,
      });
    }
  }

  // Get specific transaction
  static async getTransaction(req, res) {
    try {
      const { transactionId } = req.params;
      const passengerId = req.citizen.citizenId;

      const transaction = await Transaction.findOne({
        transactionId,
        passengerId,
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      console.error("Get transaction error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get transaction",
        error: error.message,
      });
    }
  }

  // Process refund
  static async processRefund(req, res) {
    try {
      const { transactionId } = req.params;
      const { amount, reason } = req.body;
      const passengerId = req.citizen.citizenId;

      const transaction = await Transaction.findOne({
        transactionId,
        passengerId,
        status: "completed",
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found or not eligible for refund",
        });
      }

      const refundAmount = amount || transaction.amount;

      if (refundAmount > transaction.amount) {
        return res.status(400).json({
          success: false,
          message: "Refund amount cannot exceed transaction amount",
        });
      }

      // Process refund through payment gateway
      const refundResult = await createRefund({
        chargeId: transaction.chargeId,
        amount: refundAmount,
        reason,
      });

      if (refundResult.success) {
        transaction.status = "refunded";
        transaction.refundAmount = refundAmount;
        transaction.refundReason = reason;
        await transaction.save();

        res.json({
          success: true,
          message: "Refund processed successfully",
          data: {
            transactionId,
            refundAmount,
            refundId: refundResult.refundId,
            status: "refunded",
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Refund processing failed",
          error: refundResult.error,
        });
      }
    } catch (error) {
      console.error("Process refund error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process refund",
        error: error.message,
      });
    }
  }

  // Get payment methods
  static async getPaymentMethods(req, res) {
    try {
      const paymentMethods = [
        {
          id: "stripe",
          name: "Credit/Debit Card (International)",
          description: "Pay with Visa, Mastercard, or Amex",
          enabled: true,
          processingFee: 2.9,
          currency: ["LKR", "USD"],
        },
        {
          id: "paydpi",
          name: "Local Sri Lankan Cards",
          description: "Pay with local bank cards via PayDPI",
          enabled: true,
          processingFee: 1.5,
          currency: ["LKR"],
        },
        {
          id: "digital_wallet",
          name: "Digital Wallet",
          description: "Pay with mobile wallet",
          enabled: true,
          processingFee: 1.5,
          currency: ["LKR"],
        },
        {
          id: "bank_transfer",
          name: "Bank Transfer",
          description: "Direct bank transfer",
          enabled: true,
          processingFee: 0.5,
          currency: ["LKR"],
        },
        {
          id: "cash",
          name: "Cash",
          description: "Pay with cash to driver",
          enabled: true,
          processingFee: 0,
          currency: ["LKR"],
        },
      ];

      res.json({
        success: true,
        data: paymentMethods,
      });
    } catch (error) {
      console.error("Get payment methods error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get payment methods",
        error: error.message,
      });
    }
  }
}

module.exports = PaymentController;
