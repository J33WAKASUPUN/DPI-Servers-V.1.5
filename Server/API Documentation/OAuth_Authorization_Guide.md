# 🔐 OAuth Authorization Flow Guide for SLUDI

## 📋 OAuth 2.0 Authorization Code Flow

The SLUDI system implements OAuth 2.0 Authorization Code flow. Here's how to test it step by step:

## 🚀 Step-by-Step OAuth Testing

### Step 1: Get Access Token (Login First)
Before using OAuth, you need to be authenticated as a citizen:

```http
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "john.doe@test.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "...",
      "expiresIn": 3600
    }
  }
}
```

### Step 2: OAuth Authorization Request
Make a GET request to the authorization endpoint with required parameters:

```http
GET http://localhost:3001/api/oauth/authorize?client_id=test_client&redirect_uri=http://localhost:3000/callback&response_type=code&scope=basic profile&state=xyz123
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Parameters Explained:**
- `client_id`: Identifier for the client application
- `redirect_uri`: Where to redirect after authorization
- `response_type`: Must be "code" for authorization code flow
- `scope`: Permissions requested (basic, profile)
- `state`: Security parameter to prevent CSRF attacks

**Response:**
- **Status**: 302 Redirect
- **Location Header**: `http://localhost:3000/callback?code=AUTHORIZATION_CODE&state=xyz123`

### Step 3: Extract Authorization Code
From the redirect URL, extract the authorization code:
```
http://localhost:3000/callback?code=a1b2c3d4e5f6g7h8&state=xyz123
```
Authorization Code: `a1b2c3d4e5f6g7h8`

### Step 4: Exchange Code for Token
Use the authorization code to get an OAuth access token:

```http
POST http://localhost:3001/api/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "a1b2c3d4e5f6g7h8",
  "client_id": "test_client",
  "client_secret": "test_secret",
  "redirect_uri": "http://localhost:3000/callback"
}
```

**Response:**
```json
{
  "access_token": "oauth-token-uuid-here",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "basic profile"
}
```

### Step 5: Access User Information
Use the OAuth token to get user information:

```http
GET http://localhost:3001/api/oauth/userinfo
Authorization: Bearer oauth-token-uuid-here
```

**Response:**
```json
{
  "sub": "SL1725331234567",
  "name": "John Doe",
  "email": "john.doe@test.com",
  "given_name": "John",
  "family_name": "Doe",
  "phone_number": "+94771234567"
}
```

## 🔧 Postman Testing

### Manual OAuth Testing in Postman

1. **Set Variables:**
   ```
   client_id: test_client
   redirect_uri: http://localhost:3000/callback
   state: xyz123
   scope: basic profile
   ```

2. **Authorization Request:**
   - Method: GET
   - URL: `{{baseUrl}}/api/oauth/authorize`
   - Headers: `Authorization: Bearer {{accessToken}}`
   - Params: client_id, redirect_uri, response_type=code, scope, state

3. **Extract Code from Response:**
   - Look for 302 redirect in response
   - Copy authorization code from Location header

4. **Token Exchange:**
   - Method: POST
   - URL: `{{baseUrl}}/api/oauth/token`
   - Body: JSON with grant_type, code, client_id, etc.

5. **User Info:**
   - Method: GET
   - URL: `{{baseUrl}}/api/oauth/userinfo`
   - Headers: `Authorization: Bearer {{oauthToken}}`

## 🎯 Testing with Browser (Alternative)

### Browser-Based OAuth Flow

1. **Login to get access token** (via Postman/API)

2. **Open browser and visit:**
   ```
   http://localhost:3001/api/oauth/authorize?client_id=test_client&redirect_uri=http://localhost:3000/callback&response_type=code&scope=basic%20profile&state=xyz123
   ```
   **Note:** Add your access token as a cookie or use a browser extension to add Authorization header

3. **Browser will redirect to:**
   ```
   http://localhost:3000/callback?code=AUTHORIZATION_CODE&state=xyz123
   ```

4. **Copy the authorization code** and continue with steps 4-5 above

## 🧪 Automated Testing Script

### Postman Pre-Request Script for OAuth
```javascript
// In the OAuth Token Exchange request, add this pre-request script:
const authCode = pm.collectionVariables.get("authCode");
if (!authCode) {
    console.log("Please run OAuth Authorize request first to get authorization code");
}
```

### Postman Test Script for Authorization
```javascript
// In OAuth Authorize request test script:
if (pm.response.code === 302) {
    const location = pm.response.headers.get('Location');
    if (location) {
        const url = new URL(location);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        
        if (code) {
            pm.collectionVariables.set('authCode', code);
            console.log('Authorization code extracted:', code);
        }
        
        pm.test('OAuth authorization successful', function () {
            pm.expect(code).to.not.be.undefined;
            pm.expect(state).to.eql('xyz123');
        });
    }
}
```

## 🚨 Common Issues & Solutions

### Issue 1: "Invalid OAuth parameters"
**Solution:** Ensure all required parameters are present:
- client_id
- redirect_uri  
- response_type=code

### Issue 2: "Invalid or expired authorization code"
**Solution:** 
- Authorization codes expire in 10 minutes
- Each code can only be used once
- Generate a new code if expired

### Issue 3: "Access token required"
**Solution:**
- Must be logged in before OAuth authorization
- Include valid Bearer token in Authorization header

### Issue 4: "Invalid token" in userinfo
**Solution:**
- Use the OAuth access token, not JWT access token
- Ensure OAuth token hasn't expired (1 hour)

## 🔒 Security Considerations

1. **State Parameter**: Always use state parameter to prevent CSRF
2. **Redirect URI**: Must match exactly what's registered
3. **HTTPS**: Use HTTPS in production
4. **Token Expiry**: OAuth tokens expire in 1 hour
5. **One-time Use**: Authorization codes can only be used once

## 📱 Client Application Integration

### For Frontend Applications
```javascript
// Step 1: Redirect user to authorization endpoint
const authUrl = `http://localhost:3001/api/oauth/authorize?` +
  `client_id=your_client_id&` +
  `redirect_uri=${encodeURIComponent('http://localhost:3000/callback')}&` +
  `response_type=code&` +
  `scope=basic profile&` +
  `state=${generateRandomState()}`;

window.location.href = authUrl;

// Step 2: Handle callback (in your callback route)
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');

// Step 3: Exchange code for token
const tokenResponse = await fetch('http://localhost:3001/api/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: code,
    client_id: 'your_client_id',
    client_secret: 'your_client_secret',
    redirect_uri: 'http://localhost:3000/callback'
  })
});

const tokens = await tokenResponse.json();
// Use tokens.access_token for API calls
```

## 📋 OAuth Testing Checklist

- [ ] Login and get JWT access token
- [ ] Make authorization request with valid parameters
- [ ] Receive 302 redirect with authorization code
- [ ] Extract authorization code from redirect URL
- [ ] Exchange code for OAuth access token
- [ ] Use OAuth token to access user info
- [ ] Test with invalid parameters
- [ ] Test with expired codes
- [ ] Verify state parameter validation

---

**OAuth Flow Complete! 🎉**
