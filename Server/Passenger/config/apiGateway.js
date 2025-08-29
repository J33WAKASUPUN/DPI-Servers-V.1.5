const axios = require('axios');

class ApiGatewayService {
  constructor() {
    this.baseURL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
    this.sludiURL = process.env.SLUDI_URL || 'http://localhost:3001';
    this.ndxURL = process.env.NDX_URL || 'http://localhost:3002';
    this.payDPIURL = process.env.PAYDPI_URL || 'http://localhost:3003';
  }

  // SLUDI Authentication Services
  async authenticateWithSLUDI(token) {
    try {
      const response = await axios.get(`${this.baseURL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error('Error authenticating with SLUDI:', error.message);
      throw error;
    }
  }

  async registerWithSLUDI(userData) {
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/register`, userData, {
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error('Error registering with SLUDI:', error.message);
      throw error;
    }
  }

  async loginWithSLUDI(credentials) {
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, credentials, {
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error('Error logging in with SLUDI:', error.message);
      throw error;
    }
  }

  // NDX Services
  async getSchedulesFromNDX(params = {}) {
    try {
      const response = await axios.get(`${this.baseURL}/api/schedules`, {
        params,
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching schedules from NDX:', error.message);
      throw error;
    }
  }

  async getRoutesFromNDX(params = {}) {
    try {
      const response = await axios.get(`${this.baseURL}/api/routes`, {
        params,
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching routes from NDX:', error.message);
      throw error;
    }
  }

  // PayDPI Services
  async processPaymentWithPayDPI(paymentData, token) {
    try {
      const response = await axios.post(`${this.baseURL}/api/payments/process`, paymentData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
      });
      return response.data;
    } catch (error) {
      console.error('Error processing payment with PayDPI:', error.message);
      throw error;
    }
  }

  async createJourneyInNDX(journeyData, token) {
    try {
      const response = await axios.post(`${this.baseURL}/api/journeys/book`, journeyData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error('Error creating journey in NDX:', error.message);
      throw error;
    }
  }

  async getFromPayDPI(endpoint, token) {
    try {
      const response = await axios.get(`${this.baseURL}/api/payments${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error('Error getting from PayDPI:', error.message);
      throw error;
    }
  }

  async postToPayDPI(endpoint, data, token) {
    try {
      const response = await axios.post(`${this.baseURL}/api/payments${endpoint}`, data, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error('Error posting to PayDPI:', error.message);
      throw error;
    }
  }
}

module.exports = new ApiGatewayService();