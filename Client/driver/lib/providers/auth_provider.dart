import 'dart:convert';
import 'package:flutter/material.dart';
import '../config/api.endpoints.dart';
import '../models/driver.dart';
import '../services/api_service.dart';
import '../utils/shared_prefs.dart';

class AuthProvider extends ChangeNotifier {
  Driver? _driver;
  bool _isLoading = false;
  String? _error;

  Driver? get driver => _driver;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _driver != null;

  Future<bool> login(String email, String password) async {
    _setLoading(true);
    _error = null;

    try {
      final response = await ApiService.post(
        ApiEndpoints.driverLogin,
        {'email': email, 'password': password},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final token = data['data']['tokens']['accessToken'];
        final driverData = data['data']['driver'];

        await SharedPrefs.setToken(token);
        await SharedPrefs.setDriverId(driverData['id']);

        _driver = Driver.fromJson(driverData);
        _setLoading(false);
        return true;
      } else {
        final errorData = json.decode(response.body);
        _error = errorData['message'] ?? 'Login failed';
        _setLoading(false);
        return false;
      }
    } catch (e) {
      _error = 'Network error: ${e.toString()}';
      _setLoading(false);
      return false;
    }
  }

  Future<bool> register(String email, String password, String name,
      String phone, String licenseNumber) async {
    _setLoading(true);
    _error = null;

    try {
      // Split name into first and last name
      final nameParts = name.trim().split(' ');
      final firstName = nameParts.first;
      final lastName =
          nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '';

      final response = await ApiService.post(
        ApiEndpoints.driverRegister,
        {
          'firstName': firstName,
          'lastName': lastName,
          'email': email,
          'password': password,
          'phone': phone,
          'licenseNumber': licenseNumber,
          'licenseExpiry': DateTime.now()
              .add(Duration(days: 365 * 5))
              .toIso8601String(), // 5 years from now
          'vehicleNumber':
              'TMP-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}', // Temporary vehicle number
          'vehicleType': 'bus',
        },
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = json.decode(response.body);
        final token = data['data']['tokens']['accessToken'];
        final driverData = data['data']['driver'];

        await SharedPrefs.setToken(token);
        await SharedPrefs.setDriverId(driverData['id']);

        _driver = Driver.fromJson(driverData);
        _setLoading(false);
        return true;
      } else {
        final errorData = json.decode(response.body);
        _error = errorData['message'] ?? 'Registration failed';

        // Handle validation errors specifically
        if (errorData['errors'] != null) {
          final errors = errorData['errors'] as List;
          _error = errors.map((e) => e['msg'] ?? e['message']).join(', ');
        }

        _setLoading(false);
        return false;
      }
    } catch (e) {
      _error = 'Network error: ${e.toString()}';
      _setLoading(false);
      return false;
    }
  }

  Future<bool> registerWithVehicle(
      String email,
      String password,
      String name,
      String phone,
      String licenseNumber,
      String vehicleNumber,
      String vehicleType) async {
    _setLoading(true);
    _error = null;

    try {
      // Split name into first and last name
      final nameParts = name.trim().split(' ');
      final firstName = nameParts.first;
      final lastName =
          nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '';

      final response = await ApiService.post(
        ApiEndpoints.driverRegister,
        {
          'firstName': firstName,
          'lastName': lastName,
          'email': email,
          'password': password,
          'phone': phone,
          'licenseNumber': licenseNumber,
          'licenseExpiry':
              DateTime.now().add(Duration(days: 365 * 5)).toIso8601String(),
          'vehicleNumber': vehicleNumber,
          'vehicleType': vehicleType,
        },
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = json.decode(response.body);
        final token = data['data']['tokens']['accessToken'];
        final driverData = data['data']['driver'];

        await SharedPrefs.setToken(token);
        await SharedPrefs.setDriverId(driverData['id']);

        _driver = Driver.fromJson(driverData);
        _setLoading(false);
        return true;
      } else {
        final errorData = json.decode(response.body);
        _error = errorData['message'] ?? 'Registration failed';

        // Handle validation errors specifically
        if (errorData['errors'] != null) {
          final errors = errorData['errors'] as List;
          _error = errors.map((e) => e['msg'] ?? e['message']).join(', ');
        }

        _setLoading(false);
        return false;
      }
    } catch (e) {
      _error = 'Network error: ${e.toString()}';
      _setLoading(false);
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await ApiService.post(ApiEndpoints.driverLogout, {});
    } catch (e) {
      // Ignore logout errors
    }

    await SharedPrefs.clearAll();
    _driver = null;
    notifyListeners();
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
