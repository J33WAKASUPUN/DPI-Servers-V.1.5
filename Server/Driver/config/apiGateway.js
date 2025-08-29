const axios = require('axios');

class ApiGatewayService {
  constructor() {
    this.baseURL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
    this.ndxURL = process.env.NDX_SERVICE_URL || 'http://localhost:3002';
  }

  // Get schedules from NDX through API Gateway
  async getSchedules(driverId) {
    try {
      const response = await axios.get(`${this.baseURL}/api/schedules`, {
        params: { driverId },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching schedules:', error.message);
      throw error;
    }
  }

  // Get journey details from NDX
  async getJourneyDetails(journeyId) {
    try {
      const response = await axios.get(`${this.baseURL}/api/journeys/${journeyId}`, {
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching journey details:', error.message);
      throw error;
    }
  }

  // Update journey tracking through NDX
  async updateJourneyTracking(journeyId, locationData) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/journeys/${journeyId}/track`,
        locationData,
        { timeout: 10000 }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating journey tracking:', error.message);
      throw error;
    }
  }

  // Start journey through NDX
  async startJourney(journeyId) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/journeys/${journeyId}/start`,
        {},
        { timeout: 10000 }
      );
      return response.data;
    } catch (error) {
      console.error('Error starting journey:', error.message);
      throw error;
    }
  }

  // Complete journey through NDX
  async completeJourney(journeyId) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/journeys/${journeyId}/complete`,
        {},
        { timeout: 10000 }
      );
      return response.data;
    } catch (error) {
      console.error('Error completing journey:', error.message);
      throw error;
    }
  }
}

module.exports = new ApiGatewayService();