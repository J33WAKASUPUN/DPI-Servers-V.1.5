# 🔄 OAuth Redirect URI Options for SLUDI Testing

## 🎯 The Problem
The OAuth `redirect_uri` parameter in SLUDI testing points to `http://localhost:3000/callback`, but you don't have a server running on port 3000.

## ✅ Solutions (Choose One)

### **Solution 1: Use Local HTML File (Simplest)**

1. **Open the created `oauth-callback.html` file** in your browser
2. **Update OAuth Authorization request** in Postman:
   ```
   redirect_uri=file:///h:/Flutter/SLIIT/DPI-Web-Servers/Server/oauth-callback.html
   ```
3. **After OAuth authorization**, your browser will show the authorization code
4. **Copy the code** and use it in token exchange

### **Solution 2: Start Simple Callback Server**

1. **Run the callback server:**
   ```bash
   cd h:\Flutter\SLIIT\DPI-Web-Servers\Server
   node oauth-callback-server.js
   ```
2. **Keep the existing redirect_uri:**
   ```
   redirect_uri=http://localhost:3000/callback
   ```
3. **Server will display the authorization code** at http://localhost:3000/callback

### **Solution 3: Use Online Webhook (For Remote Testing)**

1. **Go to https://webhook.site** and get a unique URL
2. **Update redirect_uri** to your webhook.site URL:
   ```
   redirect_uri=https://webhook.site/your-unique-id
   ```
3. **View the authorization code** in webhook.site interface

### **Solution 4: Use Different Port**

1. **Update redirect_uri** to any port you prefer:
   ```
   redirect_uri=http://localhost:8080/callback
   redirect_uri=http://localhost:5000/callback
   ```
2. **Start a server** on that port (modify oauth-callback-server.js PORT)

## 🔧 Updated Postman Requests

### **For Local HTML File:**
```http
GET http://localhost:3001/api/oauth/authorize?client_id=test_client&redirect_uri=file:///h:/Flutter/SLIIT/DPI-Web-Servers/Server/oauth-callback.html&response_type=code&scope=basic profile&state=xyz123
Authorization: Bearer {{accessToken}}
```

### **For Port 8080:**
```http
GET http://localhost:3001/api/oauth/authorize?client_id=test_client&redirect_uri=http://localhost:8080/callback&response_type=code&scope=basic profile&state=xyz123
Authorization: Bearer {{accessToken}}
```

## 🎯 Recommended Approach

**For Testing:** Use **Solution 1 (Local HTML File)** - it's the simplest and doesn't require running additional servers.

**For Development:** Use **Solution 2 (Callback Server)** - provides a proper HTTP endpoint and better simulation of real OAuth flow.

## 📝 Step-by-Step with Local HTML File

1. **Open `oauth-callback.html`** in your browser
2. **In Postman, update OAuth Authorize request:**
   - Change `redirect_uri` parameter to: `file:///h:/Flutter/SLIIT/DPI-Web-Servers/Server/oauth-callback.html`
3. **Run OAuth Authorize request** - it will open browser or show redirect
4. **Browser shows authorization code** in the HTML page
5. **Copy the code** and use it in "OAuth Token Exchange" request

## 🚨 Important Notes

- **Authorization codes expire in 10 minutes**
- **Each code can only be used once**
- **redirect_uri must match exactly** between authorization and token exchange requests
- **For production apps**, you'd have a real frontend application handling the callback

## 🛠️ Quick Start Commands

### Start Callback Server:
```bash
cd h:\Flutter\SLIIT\DPI-Web-Servers\Server
node oauth-callback-server.js
```

### Install Dependencies (if needed):
```bash
npm install express
```

---

**Choose the solution that works best for your testing setup! 🚀**
