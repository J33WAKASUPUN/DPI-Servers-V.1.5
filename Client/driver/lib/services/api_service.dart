import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api.endpoints.dart';
import '../utils/shared_prefs.dart';

class ApiService {
  static Future<Map<String, String>> _getHeaders() async {
    final token = SharedPrefs.getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<http.Response> get(String endpoint) async {
    final headers = await _getHeaders();
    return http.get(Uri.parse(endpoint), headers: headers);
  }

  static Future<http.Response> post(
      String endpoint, Map<String, dynamic> data) async {
    final headers = await _getHeaders();

    print('🔄 POST Request to: $endpoint');
    print('📤 Request Data: ${json.encode(data)}');

    final response = await http.post(
      Uri.parse(endpoint),
      headers: headers,
      body: json.encode(data),
    );

    print('📥 Response Status: ${response.statusCode}');
    print('📥 Response Body: ${response.body}');

    return response;
  }

  static Future<http.Response> put(
      String endpoint, Map<String, dynamic> data) async {
    final headers = await _getHeaders();
    return http.put(
      Uri.parse(endpoint),
      headers: headers,
      body: json.encode(data),
    );
  }

  static Future<http.Response> delete(String endpoint) async {
    final headers = await _getHeaders();
    return http.delete(Uri.parse(endpoint), headers: headers);
  }
}
