# 💳 PayDPI Complete Testing Guide

## 🎯 Overview
This guide provides comprehensive testing for PayDPI (Payment Digital Public Infrastructure) including integration with SLUDI and NDX servers.

## 🖥️ Server Status Check

All servers are currently running:
- **SLUDI**: http://localhost:3001 ✅
- **NDX**: http://localhost:3002 ✅ 
- **PayDPI**: http://localhost:3003 ✅

### Health Check Endpoints
```bash
GET http://localhost:3001/health  # SLUDI
GET http://localhost:3002/health  # NDX
GET http://localhost:3003/health  # PayDPI
```

## 🔐 Authentication Flow

### Step 1: Register/Login with SLUDI
Before testing PayDPI, you need a valid JWT token from SLUDI.

#### Register New User
```http
POST http://localhost:3001/api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+94771234567",
  "password": "SecurePass123!",
  "dateOfBirth": "1990-01-01",
  "address": "123 Main St, Colombo"
}
```

#### Login User
```http
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

**Response will include JWT token - Save this for PayDPI testing!**

## 💳 PayDPI Testing Scenarios

### Authentication Header
For all PayDPI requests, include:
```
Authorization: Bearer YOUR_JWT_TOKEN_FROM_SLUDI
```

## 🎁 Subsidy Management Testing

### 1. Apply for Student Subsidy
```http
POST http://localhost:3003/api/subsidies/apply
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "subsidyType": "student",
  "percentage": 50,
  "eligibilityPeriod": 365,
  "verificationDocuments": [
    {
      "documentType": "student_id",
      "documentUrl": "https://example.com/student-id.jpg",
      "uploadedAt": "2025-08-09T00:00:00.000Z"
    }
  ]
}
```

### 2. Apply for Senior Citizen Subsidy
```http
POST http://localhost:3003/api/subsidies/apply
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "subsidyType": "senior_citizen",
  "percentage": 75,
  "eligibilityPeriod": 365,
  "verificationDocuments": [
    {
      "documentType": "national_id",
      "documentUrl": "https://example.com/nic.jpg",
      "uploadedAt": "2025-08-09T00:00:00.000Z"
    }
  ]
}
```

### 3. Get Active Subsidies
```http
GET http://localhost:3003/api/subsidies/active
Authorization: Bearer YOUR_JWT_TOKEN
```

### 4. Calculate Subsidy Amount
```http
POST http://localhost:3003/api/subsidies/calculate
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "amount": 150,
  "subsidyTypes": ["student", "senior_citizen"]
}
```

### 5. Approve Subsidy (Admin Only)
```http
POST http://localhost:3003/api/subsidies/{subsidyId}/approve
Authorization: Bearer ADMIN_JWT_TOKEN
Content-Type: application/json

{
  "approvalReason": "Documents verified successfully"
}
```

## 💰 Payment Processing Testing

### 1. Get Available Payment Methods
```http
GET http://localhost:3003/api/payments/methods
Authorization: Bearer YOUR_JWT_TOKEN
```

### 2. Process Cash Payment
```http
POST http://localhost:3003/api/payments/process
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "journeyId": "journey_123",
  "amount": 150.00,
  "paymentMethod": "cash",
  "applySubsidy": true,
  "metadata": {
    "routeName": "Colombo-Kandy Express",
    "startLocation": "Fort",
    "endLocation": "Kandy",
    "departureTime": "2025-08-09T08:00:00.000Z"
  }
}
```

### 3. Process Card Payment
```http
POST http://localhost:3003/api/payments/process
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "journeyId": "journey_124",
  "amount": 200.00,
  "paymentMethod": "stripe",
  "paymentDetails": {
    "cardNumber": "4242424242424242",
    "expiryMonth": "12",
    "expiryYear": "2025",
    "cvc": "123",
    "cardholderName": "John Doe"
  },
  "applySubsidy": true,
  "metadata": {
    "routeName": "Colombo-Galle Highway",
    "startLocation": "Colombo",
    "endLocation": "Galle",
    "departureTime": "2025-08-09T10:00:00.000Z"
  }
}
```

### 4. Process Digital Wallet Payment
```http
POST http://localhost:3003/api/payments/process
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "journeyId": "journey_125",
  "amount": 100.00,
  "paymentMethod": "digital_wallet",
  "paymentDetails": {
    "walletType": "payhere",
    "walletId": "wallet_user_123"
  },
  "applySubsidy": false,
  "metadata": {
    "routeName": "Local Bus Route 138",
    "startLocation": "Pettah",
    "endLocation": "Nugegoda",
    "departureTime": "2025-08-09T14:30:00.000Z"
  }
}
```

### 5. Get Payment History
```http
GET http://localhost:3003/api/payments/history?page=1&limit=10
Authorization: Bearer YOUR_JWT_TOKEN
```

### 6. Get Specific Transaction
```http
GET http://localhost:3003/api/payments/transaction/{transactionId}
Authorization: Bearer YOUR_JWT_TOKEN
```

### 7. Process Refund
```http
POST http://localhost:3003/api/payments/transaction/{transactionId}/refund
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "reason": "Journey cancelled",
  "amount": 150.00
}
```

## 🔗 Integration Testing with NDX

### Complete Journey Flow

#### Step 1: Plan Route (NDX)
```http
GET http://localhost:3002/api/routes/find-routes?start=6.9271,79.8612&end=7.2906,80.6337&departureTime=2025-08-09T08:00:00.000Z
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Step 2: Create Journey (NDX)
```http
POST http://localhost:3002/api/journeys
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "startLocation": {
    "type": "Point",
    "coordinates": [79.8612, 6.9271],
    "name": "Colombo Fort"
  },
  "endLocation": {
    "type": "Point", 
    "coordinates": [80.6337, 7.2906],
    "name": "Kandy"
  },
  "selectedRoute": "route_id_from_step1",
  "departureTime": "2025-08-09T08:00:00.000Z"
}
```

#### Step 3: Pay for Journey (PayDPI)
Use the journeyId from Step 2 in PayDPI payment request.

## 🛠️ Admin Testing (Requires Admin Token)

### 1. Get All Transactions
```http
GET http://localhost:3003/api/payments/admin/all?page=1&limit=20&status=completed
Authorization: Bearer ADMIN_JWT_TOKEN
```

### 2. Get All Subsidies
```http
GET http://localhost:3003/api/subsidies/admin/all?page=1&limit=20&status=pending_verification
Authorization: Bearer ADMIN_JWT_TOKEN
```

### 3. Get Payment Statistics
```http
GET http://localhost:3003/api/subsidies/admin/statistics
Authorization: Bearer ADMIN_JWT_TOKEN
```

## 🧪 Error Testing Scenarios

### 1. Invalid Payment Method
```http
POST http://localhost:3003/api/payments/process
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "journeyId": "journey_126",
  "amount": 150.00,
  "paymentMethod": "invalid_method",
  "applySubsidy": false
}
```

### 2. Insufficient Payment Details
```http
POST http://localhost:3003/api/payments/process
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "journeyId": "journey_127",
  "amount": 150.00,
  "paymentMethod": "stripe"
  // Missing paymentDetails
}
```

### 3. Duplicate Subsidy Application
```http
POST http://localhost:3003/api/subsidies/apply
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "subsidyType": "student",
  "percentage": 50,
  "eligibilityPeriod": 365
}
```
(Should fail if already applied)

### 4. Unauthorized Access
```http
GET http://localhost:3003/api/payments/admin/all
Authorization: Bearer REGULAR_USER_TOKEN
```
(Should return 403 Forbidden)

## 📊 Response Examples

### Successful Payment Response
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "transactionId": "550e8400-e29b-41d4-a716-446655440000",
    "originalAmount": 150.00,
    "subsidyApplied": 75.00,
    "finalAmount": 75.00,
    "status": "completed",
    "paymentMethod": "cash",
    "receiptUrl": null
  }
}
```

### Subsidy Application Response
```json
{
  "success": true,
  "message": "Subsidy application submitted successfully",
  "data": {
    "subsidyId": "550e8400-e29b-41d4-a716-446655440001",
    "subsidyType": "student",
    "status": "pending_verification",
    "percentage": 50,
    "estimatedSavings": "Up to 50% off transportation costs"
  }
}
```

## 🔍 Troubleshooting

### Common Issues

1. **401 Unauthorized**: Ensure JWT token is valid and included in Authorization header
2. **404 Not Found**: Check endpoint URLs and ensure servers are running
3. **400 Bad Request**: Validate request body structure and required fields
4. **500 Internal Server Error**: Check server logs for detailed error messages

### Server Log Monitoring
Monitor the console outputs of all three servers for detailed error messages and request logs.

## 🎯 Test Coverage Checklist

- [ ] Health check endpoints (all servers)
- [ ] User registration and login (SLUDI)
- [ ] Subsidy application (all types)
- [ ] Subsidy approval (admin)
- [ ] Payment processing (all methods)
- [ ] Payment with subsidies
- [ ] Payment history retrieval
- [ ] Transaction details
- [ ] Refund processing
- [ ] Integration with NDX (journey creation)
- [ ] Admin endpoints
- [ ] Error scenarios
- [ ] Cross-server authentication

## 🚀 Performance Testing

### Load Testing Endpoints
- Payment processing under concurrent requests
- Subsidy calculations with multiple active subsidies
- Payment history with large datasets
- Admin statistics with extensive transaction data

This comprehensive testing guide ensures all PayDPI functionality works correctly both independently and in integration with SLUDI and NDX servers.
