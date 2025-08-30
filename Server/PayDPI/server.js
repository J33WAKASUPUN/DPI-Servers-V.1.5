const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/database");
const paymentRoutes = require("./routes/GetPayments");
const subsidyRoutes = require("./routes/subsidy");

const app = express();
const PORT = process.env.PORT || 3003;

// Connect to database
connectDB();

// Stripe webhook endpoint (must be before express.json() middleware)
app.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.log(`❌ Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    console.log(`🎣 Received webhook: ${event.type}`);

    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        console.log(`✅ Payment succeeded: ${paymentIntent.id}`);
        // Update your transaction status here
        break;
      case "payment_intent.payment_failed":
        const failedPayment = event.data.object;
        console.log(`❌ Payment failed: ${failedPayment.id}`);
        // Handle failed payment
        break;
      default:
        console.log(`🤷 Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }
);

// PayDPI webhook endpoint
app.post("/webhook/paydpi", express.json(), async (req, res) => {
  try {
    const { orderId, status, transactionId } = req.body;

    console.log(`🎣 Received PayDPI webhook: ${status} for order ${orderId}`);

    // Update transaction status based on webhook
    const Transaction = require("./models/Transaction");
    const transaction = await Transaction.findOne({ payDPIOrderId: orderId });

    if (transaction) {
      if (status === "CAPTURED") {
        transaction.status = "completed";
        transaction.payDPIPaymentStatus = "payment_completed";
        transaction.chargeId = transactionId;
      } else if (status === "FAILED") {
        transaction.status = "failed";
        transaction.payDPIPaymentStatus = "payment_failed";
      }

      await transaction.save();
    }

    res.json({ received: true });
  } catch (error) {
    console.error("PayDPI webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/payments", paymentRoutes);
app.use("/api/subsidies", subsidyRoutes);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "PayDPI Server is running",
    timestamp: new Date().toISOString(),
    services: {
      database: "connected",
      stripe: "configured",
      jwt: "configured",
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.listen(PORT, () => {
  console.log(`💳 PayDPI Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`💰 Payment API: http://localhost:${PORT}/api/payments`);
  console.log(`🎁 Subsidy API: http://localhost:${PORT}/api/subsidies`);
});

module.exports = app;
