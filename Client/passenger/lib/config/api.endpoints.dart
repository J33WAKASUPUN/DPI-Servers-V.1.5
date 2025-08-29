class ApiEndpoints {
  // Base URLs
  static const String baseUrl = 'http://192.168.43.187:3006';
  static const String apiUrl = '$baseUrl/api';

  // Auth Endpoints - Driver
  static const String driverRegister = '$apiUrl/auth/driver/register';
  static const String driverLogin = '$apiUrl/auth/driver/login';
  static const String driverForgotPassword =
      '$apiUrl/auth/driver/forgot-password';
  static const String driverResetPassword =
      '$apiUrl/auth/driver/reset-password';
  static const String driverValidateToken =
      '$apiUrl/auth/driver/validate-token';

  // Auth Endpoints - Passenger
  static const String passengerRegister = '$apiUrl/auth/passenger/register';
  static const String passengerLogin = '$apiUrl/auth/passenger/login';
  static const String passengerForgotPassword =
      '$apiUrl/auth/passenger/forgot-password';
  static const String passengerResetPassword =
      '$apiUrl/auth/passenger/reset-password';
  static const String passengerValidateToken =
      '$apiUrl/auth/passenger/validate-token';

  // User Endpoints
  static const String driverProfile = '$apiUrl/users/driver/profile';
  static const String passengerProfile = '$apiUrl/users/passenger/profile';
  static const String changePassword = '$apiUrl/users/password';
  static const String favorites = '$apiUrl/users/favorites';

  // Routes Endpoints
  static const String routes = '$apiUrl/routes';
  static const String searchRoutes = '$apiUrl/routes/search';
  static const String nearbyRoutes = '$apiUrl/routes/nearby';
  static const String geocodeRoute = '$apiUrl/routes/geocode';

  // Schedules Endpoints
  static const String schedules = '$apiUrl/schedules';
  static const String createSchedule = '$apiUrl/schedules';

  // Journey Endpoints
  static const String bookJourney = '$apiUrl/journeys/book';
  static const String passengerJourneys = '$apiUrl/journeys/passenger';
  static const String startJourney = '$apiUrl/journeys/start';
  static const String driverActiveJourney = '$apiUrl/journeys/driver/active';
  static const String journeyHistory = '$apiUrl/journeys/driver/history';

  // Map-related endpoints
  static const String mapData = '$apiUrl/map';
  static const String nearestStopEndpoint = '$apiUrl/map/nearest-stop';

  // Payment Endpoints
  static const String createPaymentOrder = '$apiUrl/payments/create-order';
  static const String paymentHistory = '$apiUrl/payments/history';

  // Socket Events
  static const String socketConnect = 'connect';
  static const String socketDisconnect = 'disconnect';
  static const String routeSubscribe = 'route:subscribe';
  static const String routeSubscribed = 'route:subscribed';
  static const String scheduleSubscribe = 'schedule:subscribe';
  static const String scheduleSubscribed = 'schedule:subscribed';
  static const String scheduleEstimatesUpdated = 'schedule:estimates:updated';
  static const String favoritesSubscribed = 'favorites:subscribed';
  static const String favoritesSuggestion = 'favorites:suggestion';
  static const String socketError = 'error';

  // Helper methods for parametrized endpoints
  static String favoriteAction(String action) => '$favorites/$action';
  static String routeById(String id) => '$routes/$id';
  static String routeByName(String name) => '$routes/name/$name';
  static String routeDirections(String id) => '$routes/$id/directions';
  static String routeMapData(String routeId) => '$routes/$routeId/map-data';
  static String deleteRoute(String id) => '$routes/$id';
  static String schedulesByRoute(String routeId) => '$schedules/route/$routeId';
  static String scheduleById(String id) => '$schedules/$id';
  static String scheduleWithFare(String id) => '$schedules/$id/with-fare';
  static String schedulePayment(String scheduleId) =>
      '$schedules/$scheduleId/pay';
  static String scheduleFare(String scheduleId) =>
      '$schedules/$scheduleId/fare';
  static String updateScheduleStatus(String id) => '$schedules/$id/status';
  static String updateSchedule(String id) => '$schedules/$id';
  static String createStopTimes(String id) => '$schedules/$id/stop-times';
  static String estimatedArrivalTimes(String scheduleId) =>
      '$schedules/$scheduleId/stop-times';
  static String estimatedArrivalTimeForStop(String scheduleId, String stopId) =>
      '$schedules/$scheduleId/stop-times/$stopId';
  static String deleteSchedule(String id) => '$schedules/$id';
  static String journeyById(String journeyId) => '$apiUrl/journeys/$journeyId';
  static String endJourney(String journeyId) =>
      '$apiUrl/journeys/$journeyId/end';
  static String completeCheckpoint(String journeyId, String stopId) =>
      '$apiUrl/journeys/$journeyId/checkpoints/$stopId';
  static String trackDriverLocation(String scheduleId) =>
      '$apiUrl/schedules/$scheduleId/location';
  static String updateDriverLocation(String scheduleId) =>
      '$apiUrl/schedules/$scheduleId/location';
  static String cancelJourney(String journeyId) =>
      '$apiUrl/journeys/$journeyId/cancel';
  static String verifyJourney(String journeyId) =>
      '$apiUrl/journeys/$journeyId/verify';
  static String payJourney(String journeyId) =>
      '$apiUrl/journeys/$journeyId/pay';
  static String capturePayment(String orderId) =>
      '$apiUrl/payments/capture/$orderId';
  static String paymentDetails(String paymentId) =>
      '$apiUrl/payments/$paymentId';
  static String processRefund(String paymentId) =>
      '$apiUrl/payments/$paymentId/refund';
  static String directions(
          double startLat, double startLng, double endLat, double endLng) =>
      '$apiUrl/map/directions?start=$startLat,$startLng&end=$endLat,$endLng';
  static String nearestStop(double latitude, double longitude) =>
      '$nearestStopEndpoint?lat=$latitude&lng=$longitude';
  static String driverLocation(String scheduleId) =>
      '$apiUrl/schedules/$scheduleId/location';

  // Helper method to get full URL (for convenience)
  static String getFullUrl(String endpoint) =>
      endpoint.startsWith('http') ? endpoint : baseUrl + endpoint;
}
