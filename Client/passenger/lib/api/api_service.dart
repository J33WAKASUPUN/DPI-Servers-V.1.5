import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:location/location.dart';
import 'package:transit_lanka/config/api.endpoints.dart';

class ApiService {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  // Helper method to get the stored token
  Future<String?> _getToken() async {
    String? token = await _storage.read(key: 'auth_token');
    print(
        'Retrieved token: ${token != null ? token.substring(0, 10) + "..." : "null"}');
    return token;
  }

  // GET request
  Future<http.Response> get(String url) async {
    final token = await _getToken();

    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };

    try {
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );

      // Log more details for debugging
      print('GET response for $url - Status: ${response.statusCode}');
      if (response.statusCode != 200) {
        print('Error response body: ${response.body}');
      }

      return response;
    } catch (e) {
      print('Error in GET request to $url: $e');
      rethrow;
    }
  }

  // POST request
  Future<http.Response> post(String url, {Map<String, dynamic>? body}) async {
    final token = await _getToken();
    print(
        'Sending POST request to $url with token: ${token != null ? "present" : "absent"}');

    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };

    try {
      final response = await http.post(
        Uri.parse(url),
        headers: headers,
        body: body != null ? json.encode(body) : null,
      );

      print('Response status code: ${response.statusCode}');
      print(
          'Response body: ${response.body.length > 100 ? response.body.substring(0, 100) + "..." : response.body}');

      return response;
    } catch (e) {
      print('Error in POST request: $e');
      rethrow;
    }
  }

  // PUT request
  Future<http.Response> put(String url, {Map<String, dynamic>? body}) async {
    final token = await _getToken();

    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };

    return await http.put(
      Uri.parse(url),
      headers: headers,
      body: body != null ? json.encode(body) : null,
    );
  }

  // DELETE request
  Future<http.Response> delete(String url) async {
    final token = await _getToken();

    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };

    return await http.delete(
      Uri.parse(url),
      headers: headers,
    );
  }

  // Add this utility function to your ApiService or create a new utility class
  Future<T?> withRetry<T>(Future<T> Function() operation, {
    int maxRetries = 3,
    Duration delay = const Duration(seconds: 1),
  }) async {
    int retries = 0;
    while (retries < maxRetries) {
      try {
        return await operation();
      } catch (e) {
        retries++;
        if (retries >= maxRetries) rethrow;
        await Future.delayed(delay * retries);
        print('Retrying operation, attempt ${retries + 1}/$maxRetries');
      }
    }
    return null;
  }

  // Fix the updateDriverLocation method
  Future<bool> updateDriverLocation(String scheduleId, LocationData location) async {
    if (location.latitude == null || location.longitude == null) {
      print('Invalid location data: latitude or longitude is null');
      return false;
    }

    return await withRetry(() async {
      // Directly implement the location update functionality here
      try {
        final response = await post(
          ApiEndpoints.updateDriverLocation(scheduleId),
          body: {
            'latitude': location.latitude!,  // Add ! to handle null safety
            'longitude': location.longitude!,  // Add ! to handle null safety
            'bearing': location.heading ?? 0.0,  // Provide default if null
            'timestamp': DateTime.now().toIso8601String(),
          },
        );
        
        print('Location update response: ${response.statusCode}');
        return response.statusCode == 200;
      } catch (e) {
        print('Error updating driver location: $e');
        print('Failed to update driver location on server');
        return false;
      }
    }) ?? false;
  }
}
