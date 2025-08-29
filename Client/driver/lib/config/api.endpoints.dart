class ApiEndpoints {
  // Base URLs - Update to use API Gateway
  static const String baseUrl =
      'http://192.168.43.187:3000'; // API Gateway port
  static const String apiUrl = '$baseUrl/api';

  // Driver Auth Endpoints (these will be proxied to Driver API on port 4001)
  static const String driverRegister = '$apiUrl/driver/auth/register';
  static const String driverLogin = '$apiUrl/driver/auth/login';
  static const String driverLogout = '$apiUrl/driver/auth/logout';
  static const String driverProfile = '$apiUrl/driver/profile';
  static const String driverValidateToken =
      '$apiUrl/driver/auth/validate-token';

  // Schedule endpoints (proxied to NDX)
  static const String schedules = '$apiUrl/schedules';
  static const String activeSchedules = '$apiUrl/schedules/active';

  // Journey endpoints (proxied to NDX)
  static const String journeys = '$apiUrl/journeys';
  static const String startJourney = '$apiUrl/journeys/start';

  // Tracking endpoints (proxied to Driver API)
  static const String trackingStart = '$apiUrl/driver/tracking/start';
  static const String trackingUpdate = '$apiUrl/driver/tracking/update';
  static const String trackingStop = '$apiUrl/driver/tracking/stop';

  // Helper methods
  static String scheduleById(String id) => '$schedules/$id';
  static String journeyById(String id) => '$journeys/$id';
  static String updateDriverLocation(String scheduleId) =>
      '$apiUrl/schedules/$scheduleId/location';
  static String driverLocation(String scheduleId) =>
      '$apiUrl/schedules/$scheduleId/location';
}
