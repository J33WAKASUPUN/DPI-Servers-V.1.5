# 💳 PayDPI (Payment Digital Public Infrastructure) API Documentation

## 📋 Overview
The PayDPI server handles all payment processing, transaction management, and subsidy calculations for the Sri Lankan public transport ecosystem.

**Server Details:**
- **Port**: 3003
- **Base URL**: `http://localhost:3003`
- **Database**: MongoDB
- **Authentication**: JWT tokens from SLUDI server
- **Payment Gateway**: Stripe integration

## 🚀 Quick Start

### Prerequisites
1. **PayDPI Server Running**: `http://localhost:3003`
2. **MongoDB Connected**
3. **SLUDI Server**: Running for authentication
4. **Stripe Configuration**: API keys configured

### Health Check
```http
GET http://localhost:3003/health
```

## 🔗 API Endpoints

### 🏥 Health & Status
- **GET** `/health` - Server health status

### 💰 Payment Processing
- **POST** `/api/payments/process` - Process journey payment
- **GET** `/api/payments/history` - Get payment history
- **GET** `/api/payments/transaction/:transactionId` - Get specific transaction
- **POST** `/api/payments/transaction/:transactionId/refund` - Process refund
- **GET** `/api/payments/methods` - Get available payment methods

### 🎁 Subsidy Management
- **GET** `/api/subsidies` - Get available subsidies
- **GET** `/api/subsidies/active` - Get active subsidies for citizen
- **POST** `/api/subsidies/calculate` - Calculate subsidy for fare amount
- **POST** `/api/subsidies/apply` - Apply subsidy to transaction

### 👨‍💼 Admin Routes
- **GET** `/api/payments/admin/all` - Get all transactions (Admin only)

## 📝 Detailed Endpoint Documentation

### Payment Processing

#### Process Journey Payment
```http
POST /api/payments/process
Authorization: Bearer jwt-access-token
Content-Type: application/json

{
  "journeyId": "journey123",
  "routeId": "route456", 
  "fareAmount": 150.00,
  "distance": 25.5,
  "paymentMethod": "stripe",
  "paymentDetails": {
    "cardToken": "tok_visa",
    "saveCard": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "transactionId": "txn_1234567890",
    "amount": 150.00,
    "subsidyApplied": 25.00,
    "finalAmount": 125.00,
    "paymentMethod": "stripe",
    "status": "completed",
    "receiptUrl": "https://stripe.com/receipt/abc123"
  }
}
```

#### Get Payment History
```http
GET /api/payments/history?page=1&limit=10&status=completed
Authorization: Bearer jwt-access-token
```

**Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "_id": "txn123",
        "passengerId": "SL2024001001",
        "journeyId": "journey123",
        "amount": 150.00,
        "subsidyAmount": 25.00,
        "finalAmount": 125.00,
        "paymentMethod": "stripe",
        "status": "completed",
        "stripePaymentId": "pi_1234567890",
        "receiptUrl": "https://stripe.com/receipt/abc123",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "pages": 5
    }
  }
}
```

#### Get Specific Transaction
```http
GET /api/payments/transaction/txn123
Authorization: Bearer jwt-access-token
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "txn123",
    "passengerId": "SL2024001001", 
    "journeyId": "journey123",
    "routeId": "route456",
    "amount": 150.00,
    "subsidyAmount": 25.00,
    "finalAmount": 125.00,
    "paymentMethod": "stripe",
    "status": "completed",
    "paymentDetails": {
      "stripePaymentId": "pi_1234567890",
      "last4": "4242",
      "brand": "visa"
    },
    "receiptUrl": "https://stripe.com/receipt/abc123",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:05Z"
  }
}
```

#### Process Refund
```http
POST /api/payments/transaction/txn123/refund
Authorization: Bearer jwt-access-token
Content-Type: application/json

{
  "reason": "Journey cancelled",
  "amount": 125.00
}
```

**Response:**
```json
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "refundId": "re_1234567890",
    "amount": 125.00,
    "status": "succeeded",
    "expectedArrival": "2024-01-20"
  }
}
```

#### Get Payment Methods
```http
GET /api/payments/methods
Authorization: Bearer jwt-access-token
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "stripe",
      "name": "Credit/Debit Card",
      "description": "Pay with Visa, Mastercard, or Amex",
      "enabled": true,
      "processingFee": 2.9
    },
    {
      "id": "digital_wallet",
      "name": "Digital Wallet", 
      "description": "Pay with mobile wallet",
      "enabled": true,
      "processingFee": 1.5
    },
    {
      "id": "bank_transfer",
      "name": "Bank Transfer",
      "description": "Direct bank transfer",
      "enabled": true,
      "processingFee": 0.5
    },
    {
      "id": "cash",
      "name": "Cash",
      "description": "Pay with cash to driver",
      "enabled": true,
      "processingFee": 0
    }
  ]
}
```

### Subsidy Management

#### Get Available Subsidies
```http
GET /api/subsidies
Authorization: Bearer jwt-access-token
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "sub123",
      "name": "Student Discount",
      "description": "50% discount for students",
      "type": "percentage",
      "value": 50,
      "eligibilityRules": {
        "userType": "student",
        "maxAge": 25
      },
      "isActive": true
    },
    {
      "_id": "sub456", 
      "name": "Senior Citizen Discount",
      "description": "Free transport for seniors",
      "type": "fixed",
      "value": 0,
      "eligibilityRules": {
        "minAge": 60
      },
      "isActive": true
    }
  ]
}
```

#### Get Active Subsidies
```http
GET /api/subsidies/active
Authorization: Bearer jwt-access-token
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "sub123",
      "name": "Student Discount",
      "description": "50% discount for students", 
      "type": "percentage",
      "value": 50,
      "appliedAmount": 75.00
    }
  ]
}
```

#### Calculate Subsidy
```http
POST /api/subsidies/calculate
Authorization: Bearer jwt-access-token
Content-Type: application/json

{
  "fareAmount": 150.00,
  "routeId": "route456",
  "distance": 25.5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "originalAmount": 150.00,
    "subsidyAmount": 75.00,
    "finalAmount": 75.00,
    "appliedSubsidies": [
      {
        "subsidyId": "sub123",
        "name": "Student Discount",
        "discountAmount": 75.00
      }
    ]
  }
}
```

#### Apply Subsidy
```http
POST /api/subsidies/apply
Authorization: Bearer jwt-access-token
Content-Type: application/json

{
  "transactionId": "txn123",
  "subsidyId": "sub123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subsidy applied successfully",
  "data": {
    "transactionId": "txn123",
    "subsidyApplied": {
      "subsidyId": "sub123",
      "name": "Student Discount", 
      "discountAmount": 75.00
    },
    "newFinalAmount": 75.00
  }
}
```

## 🔒 Authentication

All payment endpoints require JWT authentication from SLUDI server:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Admin Routes
Admin-only endpoints require `role: "admin"` in JWT token.

## 📊 Data Models

### Transaction
```javascript
{
  _id: ObjectId,
  transactionId: String, // Unique transaction ID
  passengerId: String, // Citizen ID from SLUDI
  journeyId: ObjectId, // Reference to NDX journey
  routeId: ObjectId, // Reference to NDX route
  amount: Number, // Original fare amount
  subsidyAmount: Number, // Discount applied
  finalAmount: Number, // Amount actually charged
  paymentMethod: String, // 'stripe', 'digital_wallet', etc.
  status: String, // 'pending', 'completed', 'failed', 'refunded'
  paymentDetails: {
    stripePaymentId: String,
    last4: String,
    brand: String,
    receiptUrl: String
  },
  subsidiesApplied: [{
    subsidyId: ObjectId,
    name: String,
    discountAmount: Number
  }],
  refunds: [{
    refundId: String,
    amount: Number,
    reason: String,
    processedAt: Date
  }],
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
}
```

### Subsidy
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  type: String, // 'percentage', 'fixed', 'tiered'
  value: Number, // Percentage or fixed amount
  eligibilityRules: {
    userType: String, // 'student', 'senior', etc.
    minAge: Number,
    maxAge: Number,
    incomeThreshold: Number,
    region: String
  },
  conditions: {
    maxUsagePerDay: Number,
    maxUsagePerMonth: Number,
    applicableRoutes: [ObjectId],
    timeRestrictions: [{
      startTime: String,
      endTime: String,
      daysOfWeek: [Number]
    }]
  },
  budget: {
    totalAllocated: Number,
    totalUsed: Number,
    monthlyLimit: Number
  },
  validFrom: Date,
  validTo: Date,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## 🚨 Error Responses

### Payment Failed (400)
```json
{
  "success": false,
  "message": "Payment processing failed",
  "error": "Insufficient funds",
  "errorCode": "PAYMENT_DECLINED"
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "message": "Access token required"
}
```

### Transaction Not Found (404)
```json
{
  "success": false,
  "message": "Transaction not found"
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Payment processing failed",
  "error": "Stripe API connection failed"
}
```

## 💎 Stripe Integration

### Supported Payment Methods
- Credit/Debit Cards (Visa, Mastercard, Amex)
- Digital Wallets (Apple Pay, Google Pay)
- Bank Transfers
- Cash Payments (recorded for tracking)

### Webhook Events
PayDPI handles these Stripe webhook events:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.dispute.created`
- `invoice.payment_succeeded`

### Test Cards (Development)
```
Visa: 4242 4242 4242 4242
Mastercard: 5555 5555 5555 4444
Declined: 4000 0000 0000 0002
```

## 🧪 Testing Examples

### Complete Payment Flow
```bash
# 1. Check available payment methods
GET /api/payments/methods

# 2. Calculate subsidies
POST /api/subsidies/calculate
{
  "fareAmount": 150.00,
  "routeId": "route456",
  "distance": 25.5
}

# 3. Process payment
POST /api/payments/process
{
  "journeyId": "journey123",
  "routeId": "route456",
  "fareAmount": 150.00,
  "paymentMethod": "stripe",
  "paymentDetails": {
    "cardToken": "tok_visa"
  }
}

# 4. Check payment history
GET /api/payments/history

# 5. Get transaction details
GET /api/payments/transaction/txn123
```

### Subsidy Testing
```bash
# 1. Get available subsidies
GET /api/subsidies

# 2. Get active subsidies for citizen
GET /api/subsidies/active

# 3. Apply subsidy to existing transaction
POST /api/subsidies/apply
{
  "transactionId": "txn123",
  "subsidyId": "sub123"
}
```

## 🔧 Environment Variables

Required environment variables:
```env
PORT=3003
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=same_as_sludi_server
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NODE_ENV=development
```

## 🛠️ Troubleshooting

### Common Issues

1. **Payment Declined**
   - Check card details and balance
   - Verify Stripe test card numbers
   - Check payment method configuration

2. **Webhook Issues**
   - Verify webhook endpoint URL
   - Check webhook signature verification
   - Ensure webhook secret is correct

3. **Subsidy Calculation**
   - Check citizen eligibility rules
   - Verify subsidy is active and within date range
   - Check subsidy budget limits

4. **Authentication Errors**
   - Ensure JWT token is valid and not expired
   - Check if citizen exists in SLUDI database
   - Verify token has required permissions

## 📞 Support

For PayDPI API issues:
- Check server logs for Stripe errors
- Verify webhook endpoints are accessible
- Test with Stripe test environment first
- Ensure subsidy rules are correctly configured

---

**PayDPI - Secure Payments for Sri Lanka's Digital Infrastructure! 💳**