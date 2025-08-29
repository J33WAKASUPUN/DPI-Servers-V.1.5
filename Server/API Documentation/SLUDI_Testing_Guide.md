# 🔐 SLUDI Authentication API Testing Guide

## 📋 Overview
This testing collection covers all authentication endpoints for the SLUDI (Sri Lanka Unified Digital Identity) server including:
- User registration and login
- Token management (access & refresh tokens)
- OAuth 2.0 flow
- Profile management
- Error handling scenarios

## 🚀 Quick Start

### Prerequisites
1. **SLUDI Server Running**: Ensure the SLUDI server is running on `http://localhost:3001`
2. **MongoDB**: Database should be connected and running
3. **Postman**: Import the collection and environment files

### Import Files
1. Import `SLUDI_Auth_Testing_Collection.postman_collection.json`
2. Import `SLUDI_Auth_Environment.postman_environment.json`
3. Select the "SLUDI Auth Environment" in Postman

## 🔗 API Endpoints

### Health Check
- **GET** `/health` - Server health status

### Authentication Endpoints
- **POST** `/api/auth/register` - Register new citizen
- **POST** `/api/auth/login` - Login citizen
- **POST** `/api/auth/refresh-token` - Refresh access token
- **POST** `/api/auth/logout` - Logout citizen
- **GET** `/api/auth/profile` - Get user profile (Protected)
- **PUT** `/api/auth/profile` - Update user profile (Protected)

### OAuth 2.0 Endpoints
- **GET** `/api/oauth/authorize` - OAuth authorization endpoint (Protected)
- **POST** `/api/oauth/token` - OAuth token exchange
- **GET** `/api/oauth/userinfo` - Get user info with OAuth token

## � How to Test OAuth Authorization

### Quick OAuth Flow:
1. **Login first** to get JWT access token
2. **Make authorization request** with Bearer token
3. **Extract authorization code** from redirect response
4. **Exchange code for OAuth token**
5. **Use OAuth token** to access user info

### Example OAuth Authorization Request:
```http
GET /api/oauth/authorize?client_id=test_client&redirect_uri=http://localhost:3000/callback&response_type=code&scope=basic profile&state=xyz123
Authorization: Bearer YOUR_JWT_ACCESS_TOKEN
```

**Response:** 302 Redirect with authorization code in Location header

### Example Token Exchange:
```http
POST /api/oauth/token
{
  "grant_type": "authorization_code",
  "code": "EXTRACTED_AUTH_CODE",
  "client_id": "test_client",
  "client_secret": "test_secret",
  "redirect_uri": "http://localhost:3000/callback"
}
```

**⚠️ Important:** See `OAuth_Authorization_Guide.md` for detailed step-by-step instructions.

## �📝 Testing Workflow

### 1. Complete Authentication Flow
```
Health Check → Register → Login → Get Profile → Update Profile → Logout
```

### 2. OAuth Flow
```
Login → OAuth Authorize → Token Exchange → User Info
```

### 3. Token Management
```
Login → Refresh Token → Access Protected Resource
```

## 🧪 Test Scenarios

### ✅ Positive Test Cases

#### Registration
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe.{randomInt}@test.com",
  "phoneNumber": "+94{randomInt}",
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
```

#### Login
```json
{
  "email": "john.doe@test.com",
  "password": "password123"
}
```

#### Profile Update
```json
{
  "firstName": "John Updated",
  "phoneNumber": "+94771234567",
  "address": {
    "street": "456 Updated Street",
    "city": "Kandy",
    "state": "Central",
    "zipCode": "20000",
    "country": "Sri Lanka"
  }
}
```

### ❌ Negative Test Cases

1. **Invalid Email Format** - Registration with malformed email
2. **Duplicate Registration** - Register with existing email/phone
3. **Invalid Login** - Wrong credentials
4. **Unauthorized Access** - Access protected routes without token
5. **Invalid Token** - Use malformed or expired tokens
6. **Invalid OAuth Parameters** - Malformed OAuth requests

## 🔧 Environment Variables

The collection uses these environment variables (auto-populated):
- `baseUrl`: Server base URL (http://localhost:3001)
- `accessToken`: JWT access token
- `refreshToken`: JWT refresh token
- `citizenId`: Unique citizen identifier
- `authCode`: OAuth authorization code
- `oauthToken`: OAuth access token

## 📊 Expected Responses

### Successful Registration (201)
```json
{
  "success": true,
  "message": "Citizen registered successfully",
  "data": {
    "citizen": {
      "citizenId": "SL172533...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@test.com",
      "phoneNumber": "+94771234567",
      "isVerified": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

### Successful Login (200)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "citizen": {
      "citizenId": "SL172533...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@test.com",
      "role": "citizen",
      "isVerified": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

### OAuth Token Exchange (200)
```json
{
  "access_token": "uuid-based-token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "basic profile"
}
```

## 🚨 Error Responses

### Authentication Error (401)
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### Validation Error (400)
```json
{
  "success": false,
  "message": "Citizen with this email or phone number already exists"
}
```

### OAuth Error (400)
```json
{
  "error": "unsupported_grant_type",
  "error_description": "Only authorization_code grant type is supported"
}
```

## 🎯 Rate Limiting

- **Register**: 3 requests per window
- **Login**: 5 requests per window

## 🔒 Security Features

1. **JWT Tokens**: Secure access and refresh tokens
2. **Password Hashing**: bcryptjs hashing
3. **Rate Limiting**: Protection against brute force
4. **Token Validation**: Comprehensive token verification
5. **OAuth 2.0**: Standard OAuth implementation

## 📋 Testing Checklist

### Authentication Flow
- [ ] Health check responds correctly
- [ ] User registration works with valid data
- [ ] Registration rejects invalid email format
- [ ] Registration prevents duplicate users
- [ ] Login works with valid credentials
- [ ] Login rejects invalid credentials
- [ ] Token refresh works correctly
- [ ] Logout invalidates tokens

### Protected Routes
- [ ] Profile retrieval works with valid token
- [ ] Profile update works correctly
- [ ] Protected routes reject invalid tokens
- [ ] Protected routes reject missing tokens

### OAuth Flow
- [ ] Authorization endpoint redirects correctly
- [ ] Token exchange works with valid auth code
- [ ] User info endpoint returns correct data
- [ ] Invalid grant types are rejected

### Error Handling
- [ ] All endpoints return proper error messages
- [ ] HTTP status codes are correct
- [ ] Rate limiting works as expected

## 🛠️ Troubleshooting

### Common Issues

1. **Server Not Running**
   - Ensure SLUDI server is running on port 3001
   - Check database connection

2. **Token Expiry**
   - Use refresh token to get new access token
   - Re-authenticate if refresh token expired

3. **OAuth Redirects**
   - OAuth authorize endpoint returns 302 redirect
   - Extract auth code from Location header

4. **Environment Variables**
   - Ensure environment is selected in Postman
   - Variables are automatically set by test scripts

## 📞 Support

For issues or questions about the SLUDI authentication system, check:
- Server logs for detailed error messages
- Database connectivity
- Environment variable configuration
- JWT secret configuration

---

**Happy Testing! 🚀**
