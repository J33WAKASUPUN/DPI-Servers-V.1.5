# 🚀 Complete DPI Ecosystem Testing Guide

## 📋 Overview
This guide covers testing all three servers in the Sri Lankan Digital Public Infrastructure (DPI) ecosystem:

1. **SLUDI** (Port 3001) - Identity & Authentication
2. **NDX** (Port 3002) - National Data Exchange  
3. **PayDPI** (Port 3003) - Payment Infrastructure

## 🔧 Server Setup

### Start All Servers
```bash
# Terminal 1 - SLUDI Server
cd h:\Flutter\SLIIT\DPI-Web-Servers\Server\SLUDI
npm start

# Terminal 2 - NDX Server  
cd h:\Flutter\SLIIT\DPI-Web-Servers\Server\NDX
npm start

# Terminal 3 - PayDPI Server
cd h:\Flutter\SLIIT\DPI-Web-Servers\Server\PayDPI
npm start
```

### Health Check All Servers
```bash
# SLUDI Health
GET http://localhost:3001/health

# NDX Health  
GET http://localhost:3002/health

# PayDPI Health
GET http://localhost:3003/health
```

## 🔄 Complete User Journey Testing

### Phase 1: Authentication (SLUDI)
```bash
# 1. Register new citizen
POST http://localhost:3001/api/auth/register
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john.doe@test.com",
  "phoneNumber": "+94771234567",
  "password": "password123",
  "dateOfBirth": "1990-01-01",
  "address": {
    "street": "123 Main Street",
    "city": "Colombo",
    "state": "Western", 
    "zipCode": "00100",
    "country": "Sri Lanka"
  }
}

# 2. Login citizen
POST http://localhost:3001/api/auth/login
{
  "email": "john.doe@test.com",
  "password": "password123"
}
# Save accessToken for subsequent requests
```

### Phase 2: Journey Planning (NDX)
```bash
# 3. Search locations
GET http://localhost:3002/api/routes/search-locations?query=Colombo Fort

# 4. Find routes between locations
GET http://localhost:3002/api/routes/find-routes?from=79.8511,6.9344&to=79.8607,6.9271

# 5. Get route details
GET http://localhost:3002/api/routes/route123/details

# 6. Check schedules
GET http://localhost:3002/api/schedules/route/route123

# 7. Find nearby stops
GET http://localhost:3002/api/routes/nearby-stops?lat=6.9344&lng=79.8511&radius=1000
```

### Phase 3: Payment Processing (PayDPI)
```bash
# 8. Check available payment methods
GET http://localhost:3003/api/payments/methods
Authorization: Bearer {accessToken}

# 9. Calculate subsidies
POST http://localhost:3003/api/subsidies/calculate
Authorization: Bearer {accessToken}
{
  "fareAmount": 150.00,
  "routeId": "route456",
  "distance": 25.5
}

# 10. Process payment
POST http://localhost:3003/api/payments/process
Authorization: Bearer {accessToken}
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

# 11. Check payment history
GET http://localhost:3003/api/payments/history
Authorization: Bearer {accessToken}
```

### Phase 4: OAuth Integration Testing
```bash
# 12. OAuth Authorization
GET http://localhost:3001/api/oauth/authorize?client_id=test_client&redirect_uri=http://localhost:3000/callback&response_type=code&scope=basic profile&state=xyz123
Authorization: Bearer {accessToken}

# 13. Token Exchange
POST http://localhost:3001/api/oauth/token
{
  "grant_type": "authorization_code",
  "code": "AUTHORIZATION_CODE",
  "client_id": "test_client",
  "client_secret": "test_secret",
  "redirect_uri": "http://localhost:3000/callback"
}

# 14. Get user info
GET http://localhost:3001/api/oauth/userinfo
Authorization: Bearer {oauthToken}
```

## 🧪 Cross-Server Integration Tests

### Test 1: Complete Journey with Payment
```javascript
// Postman Pre-request Script
pm.test("Complete Journey Flow", function() {
  // 1. Authenticate with SLUDI
  // 2. Plan journey with NDX
  // 3. Process payment with PayDPI
  // 4. Verify all data consistency
});
```

### Test 2: User Profile Sync
```bash
# Verify citizen data consistency across servers
GET http://localhost:3001/api/auth/profile
GET http://localhost:3003/api/payments/history
# Ensure citizenId matches in all responses
```

### Test 3: OAuth Token Cross-Server Usage
```bash
# Get OAuth token from SLUDI
# Use it to access protected resources in NDX/PayDPI
GET http://localhost:3002/api/routes/user-preferences
Authorization: Bearer {oauthToken}
```

## 📊 Testing Scenarios

### Positive Test Cases
1. ✅ **Happy Path**: Register → Login → Find Route → Pay → Complete Journey
2. ✅ **Subsidy Application**: Student/Senior discount calculations
3. ✅ **Multiple Payment Methods**: Card, wallet, bank transfer
4. ✅ **OAuth Flow**: Complete authorization code flow
5. ✅ **Journey History**: Track multiple trips

### Negative Test Cases  
1. ❌ **Invalid Authentication**: Expired tokens, wrong credentials
2. ❌ **Payment Failures**: Declined cards, insufficient funds
3. ❌ **Invalid Routes**: Non-existent locations, invalid coordinates
4. ❌ **Subsidy Limits**: Exceeded daily/monthly limits
5. ❌ **OAuth Errors**: Invalid codes, wrong redirect URIs

### Load Testing
1. 📈 **Concurrent Users**: 100+ simultaneous login attempts
2. 📈 **Route Queries**: High-volume location searches
3. 📈 **Payment Processing**: Multiple simultaneous transactions
4. 📈 **Database Performance**: Large dataset operations

## 🔧 Postman Collection Structure

```
DPI_Complete_Testing/
├── 01_SLUDI_Authentication/
│   ├── Health_Check
│   ├── Register_Citizen
│   ├── Login_Citizen
│   ├── Get_Profile
│   ├── Update_Profile
│   ├── Refresh_Token
│   └── Logout
├── 02_SLUDI_OAuth/
│   ├── OAuth_Authorize
│   ├── OAuth_Token_Exchange
│   └── OAuth_UserInfo
├── 03_NDX_Routes/
│   ├── Health_Check
│   ├── Search_Locations
│   ├── Find_Routes
│   ├── Nearby_Stops
│   ├── Get_All_Routes
│   ├── Route_Details
│   └── Get_Schedules
├── 04_PayDPI_Payments/
│   ├── Health_Check
│   ├── Payment_Methods
│   ├── Process_Payment
│   ├── Payment_History
│   ├── Transaction_Details
│   ├── Process_Refund
│   └── Calculate_Subsidy
└── 05_Integration_Tests/
    ├── Complete_Journey_Flow
    ├── Cross_Server_Authentication
    ├── Payment_with_Subsidy
    └── OAuth_Integration
```

## 🚨 Error Handling Tests

### Authentication Errors
```bash
# Test expired tokens
GET http://localhost:3003/api/payments/history
Authorization: Bearer expired_token

# Test invalid credentials
POST http://localhost:3001/api/auth/login
{
  "email": "wrong@email.com",
  "password": "wrongpassword"
}
```

### Payment Errors
```bash
# Test declined payment
POST http://localhost:3003/api/payments/process
{
  "paymentDetails": {
    "cardToken": "tok_chargeDeclined"
  }
}

# Test insufficient funds
POST http://localhost:3003/api/payments/process
{
  "paymentDetails": {
    "cardToken": "tok_insufficientFunds"
  }
}
```

### Route Errors
```bash
# Test invalid coordinates
GET http://localhost:3002/api/routes/find-routes?from=invalid,coords&to=180,90

# Test non-existent route
GET http://localhost:3002/api/routes/nonexistent123/details
```

## 📋 Testing Checklist

### Pre-Testing Setup
- [ ] All three servers running
- [ ] MongoDB connected for all servers
- [ ] Environment variables configured
- [ ] Stripe test keys configured
- [ ] Postman collections imported

### Core Functionality
- [ ] SLUDI authentication works
- [ ] JWT tokens are generated and validated
- [ ] NDX route search returns results
- [ ] PayDPI payment processing succeeds
- [ ] Cross-server authentication works

### Integration Points
- [ ] Citizen ID consistency across servers
- [ ] JWT tokens work across all servers
- [ ] OAuth tokens provide access to all services
- [ ] Payment records link to journey data
- [ ] Subsidy calculations are accurate

### Error Scenarios
- [ ] Graceful handling of invalid tokens
- [ ] Proper error messages for failed payments
- [ ] Validation errors return appropriate codes
- [ ] Server errors don't expose sensitive data

### Performance
- [ ] Response times under 2 seconds
- [ ] Database queries optimized
- [ ] Concurrent requests handled properly
- [ ] Rate limiting works correctly

## 🛠️ Troubleshooting Guide

### Common Issues

1. **CORS Errors**
   ```javascript
   // Ensure all servers have correct CORS configuration
   app.use(cors({
     origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
     credentials: true
   }));
   ```

2. **JWT Secret Mismatch**
   ```bash
   # Ensure all servers use the same JWT_SECRET
   # Check .env files in all three directories
   ```

3. **Database Connection Issues**
   ```bash
   # Check MongoDB connection strings
   # Ensure database names are unique per server
   ```

4. **Stripe Configuration**
   ```bash
   # Verify webhook endpoints are accessible
   # Check test vs production keys
   # Validate webhook signatures
   ```

## 📞 Support & Documentation

### Additional Resources
- [SLUDI API Documentation](SLUDI_Testing_Guide.md)
- [NDX API Documentation](NDX_API_Documentation.md)  
- [PayDPI API Documentation](PayDPI_API_Documentation.md)
- [OAuth Flow Guide](OAuth_Authorization_Guide.md)
- [Redirect Solutions](OAuth_Redirect_Solutions.md)

### Getting Help
1. Check server logs for detailed error messages
2. Verify environment variables are set correctly
3. Test individual servers before integration testing
4. Use development/test modes for debugging

---

**Complete DPI Ecosystem - Powering Sri Lanka's Digital Future! 🇱🇰**