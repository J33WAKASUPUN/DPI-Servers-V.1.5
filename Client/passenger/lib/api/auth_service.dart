import 'dart:convert';
import 'dart:math';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../models/user.dart';
import '../../models/driver.dart';
import '../../models/passenger.dart';
import '../../../config/api.endpoints.dart';

class AuthService {
  // Login method
  Future<User> login(String email, String password, String role) async {
    try {
      final endpoint = role == 'driver'
          ? ApiEndpoints.driverLogin
          : ApiEndpoints.passengerLogin;

      final response = await http.post(
        Uri.parse(endpoint),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        // Add null safety checks here
        if (data == null) {
          throw Exception('Server returned null response');
        }

        if (data['status'] != true) {
          throw Exception(data['message'] ?? 'Login failed');
        }

        // Extract token - check for various possible paths
        final String? tokenData = data['token'] ?? data['data']?['token'];

        if (tokenData == null) {
          throw Exception('No authentication token received');
        }

        // Safely extract user data
        final Map<String, dynamic> userData;
        if (role == 'driver') {
          userData = data['data']?['driver'] ?? data['data'] ?? {};
        } else {
          userData = data['data']?['passenger'] ?? data['data'] ?? {};
        }

        // Create user object with null safety
        final user = User(
          id: userData['_id'] ?? '',
          name: userData['name'] ?? '',
          email: userData['email'] ?? '',
          phone: userData['phone'] ?? '',
          role: role,
          profileImageUrl: userData['image'],
          token: tokenData,
        );

        // Save user data to local storage
        await _saveUserData(user);

        return user;
      } else {
        final errorData = jsonDecode(response.body);
        throw Exception(errorData['message'] ??
            'Login failed with status code ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to login: $e');
    }
  }

  // Register method - modified to login automatically after registration
  Future<User> register(
      String name, String email, String phone, String password, String role,
      {Map<String, dynamic>? additionalInfo}) async {
    try {
      final endpoint = role == 'driver'
          ? ApiEndpoints.driverRegister
          : ApiEndpoints.passengerRegister;

      // Base registration data
      final Map<String, dynamic> registrationData = {
        'name': name,
        'email': email,
        'phone': phone,
        'password': password,
      };

      // Print debug info
      print('Register role: $role');
      print('Additional info: $additionalInfo');

      // For driver, add bus details - handle both formats for flexibility
      if (role == 'driver' && additionalInfo != null) {
        if (additionalInfo.containsKey('busDetails')) {
          // Use existing nested structure
          registrationData['busDetails'] = additionalInfo['busDetails'];
        } else {
          // Use flat structure if that's what register screen provides
          registrationData['busDetails'] = {
            'busNumber': additionalInfo['vehicleNumber'] ??
                additionalInfo['busNumber'] ??
                '',
            'busModel': additionalInfo['vehicleType'] ??
                additionalInfo['busModel'] ??
                '',
            'busColor': additionalInfo['vehicleColor'] ??
                additionalInfo['busColor'] ??
                '',
          };
        }

        registrationData['licenseNumber'] =
            additionalInfo['licenseNumber'] ?? '';
        registrationData['address'] = additionalInfo['address'] ?? '';
      }

      // For passenger, add addresses if provided
      if (role == 'passenger' && additionalInfo != null) {
        if (additionalInfo.containsKey('addresses')) {
          registrationData['addresses'] = additionalInfo['addresses'];
        }
      }

      print('Sending registration data: $registrationData');

      final response = await http.post(
        Uri.parse(endpoint),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(registrationData),
      );

      print('Register response status: ${response.statusCode}');
      print('Register response body: ${response.body}');

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);

        if (!data['status']) {
          throw Exception(data['message'] ?? 'Registration failed');
        }

        // Create user from response data
        final userData = data['data'];

        // Auto-login after successful registration
        return await login(email, password, role);
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['message'] ?? 'Registration failed');
      }
    } catch (e) {
      throw Exception('Failed to register: $e');
    }
  }

  // Request password reset
  Future<bool> requestPasswordReset(String email, String role) async {
    try {
      final endpoint = role == 'driver'
          ? ApiEndpoints.driverForgotPassword
          : ApiEndpoints.passengerForgotPassword;

      final response = await http.post(
        Uri.parse(endpoint),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
        }),
      );

      final data = jsonDecode(response.body);
      return data['status'] == true;
    } catch (e) {
      throw Exception('Failed to request password reset: $e');
    }
  }

  // Reset password with token
  Future<bool> resetPassword(String token, String password, String role) async {
    try {
      final endpoint = role == 'driver'
          ? ApiEndpoints.driverResetPassword
          : ApiEndpoints.passengerResetPassword;

      final response = await http.post(
        Uri.parse(endpoint),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'token': token,
          'password': password,
        }),
      );

      final data = jsonDecode(response.body);
      return data['status'] == true;
    } catch (e) {
      throw Exception('Failed to reset password: $e');
    }
  }

  // Change password for logged in user
  Future<bool> changePassword(
      String currentPassword, String newPassword) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('user_token');

      if (token == null) {
        throw Exception('No authentication token found');
      }

      final response = await http.put(
        Uri.parse(ApiEndpoints.changePassword),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        }),
      );

      final data = jsonDecode(response.body);
      return data['status'] == true;
    } catch (e) {
      throw Exception('Failed to change password: $e');
    }
  }

  // Logout method - just clears local storage
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('user');
  }

  // Get current user from shared preferences
  Future<User?> getCurrentUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userData = prefs.getString('user');

    if (userData != null) {
      return User.fromJson(jsonDecode(userData));
    }

    return null;
  }

  // Save user data to shared preferences
  Future<void> _saveUserData(User user) async {
    final prefs = await SharedPreferences.getInstance();
    final storage = const FlutterSecureStorage();

    // Store token in secure storage
    await storage.write(key: 'auth_token', value: user.token);
    print(
        'Saved token to secure storage: ${user.token?.substring(0, 10) ?? 'null'}...');

    // Store complete user data as JSON
    await prefs.setString('user', jsonEncode(user.toJson()));

    // Also store individual fields for convenience
    await prefs.setString('user_id', user.id);
    await prefs.setString('user_name', user.name);
    await prefs.setString('user_email', user.email);
    await prefs.setString('user_role', user.role);
  }

  // Get specific user profile (driver or passenger)
  Future<dynamic> getUserProfile(String role) async {
    try {
      // Get token from storage
      final storage = const FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      final prefs = await SharedPreferences.getInstance();

      print(
          'Getting $role profile with token: ${token != null ? "${token.substring(0, min(15, token.length))}..." : "null"}');

      if (token == null) {
        throw Exception('Authentication token not found');
      }

      final endpoint = role == 'driver'
          ? ApiEndpoints.driverProfile
          : ApiEndpoints.passengerProfile;

      final response = await http.get(
        Uri.parse(endpoint),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      print('Profile response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        if (data['status'] != true) {
          throw Exception(data['message'] ?? 'Failed to get user profile');
        }

        if (role == 'driver') {
          return Driver.fromJson(data['data']);
        } else {
          return Passenger.fromJson(data['data']);
        }
      } else if (response.statusCode == 401 || response.statusCode == 403) {
        // Handle both 401 (Unauthorized) and 403 (Forbidden) as session expiry
        await storage.delete(key: 'auth_token');
        await prefs.remove('user');
        throw Exception(
            'Your session has expired or you are not authorized. Please log in again.');
      } else {
        throw Exception(
            'Failed to get user profile: Server returned ${response.statusCode}');
      }
    } catch (e) {
      print('Error in getUserProfile: $e');
      rethrow;
    }
  }

  // Validate token
  Future<bool> validateToken(String token, String role) async {
    try {
      final endpoint = role == 'driver'
          ? ApiEndpoints.driverValidateToken
          : ApiEndpoints.passengerValidateToken;

      final response = await http.get(
        Uri.parse(endpoint),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['status'] == true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}
