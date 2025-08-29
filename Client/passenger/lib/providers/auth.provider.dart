import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../services/api/auth_service.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();

  User? _currentUser;
  bool _isLoading = false;
  String? _error;

  User? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _currentUser != null;
  bool get isDriver => _currentUser?.role == 'driver';
  bool get isPassenger => _currentUser?.role == 'passenger';

  // Add this getter to expose the token
  String? get token => _currentUser?.token;

  // Initialize provider by checking stored user data
  Future<void> initialize() async {
    _isLoading = true;
    notifyListeners();

    try {
      final user = await _authService.getCurrentUser();
      if (user != null) {
        // Validate token before setting user
        final isValid =
            await _authService.validateToken(user.token ?? '', user.role);

        if (isValid) {
          _currentUser = user;
        }
      }
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Login method
  Future<bool> login(String email, String password, String role) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentUser = await _authService.login(email, password, role);
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Register method
  Future<bool> register(
      String name, String email, String phone, String password, String role,
      {Map<String, dynamic>? additionalInfo}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentUser = await _authService.register(
          name, email, phone, password, role,
          additionalInfo: additionalInfo);
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Request password reset
  Future<bool> requestPasswordReset(String email, String role) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final success = await _authService.requestPasswordReset(email, role);
      _error = null;
      notifyListeners();
      return success;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Reset password with token
  Future<bool> resetPassword(String token, String password, String role) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final success = await _authService.resetPassword(token, password, role);
      _error = null;
      notifyListeners();
      return success;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Change password (for logged in user)
  Future<bool> changePassword(
      String currentPassword, String newPassword) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final success =
          await _authService.changePassword(currentPassword, newPassword);
      _error = null;
      notifyListeners();
      return success;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Logout method
  Future<bool> logout() async {
    try {
      final secureStorage = FlutterSecureStorage();
      await secureStorage.delete(key: 'auth_token');

      // Clear all cached data
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();

      _currentUser = null;
      notifyListeners();
      return true;
    } catch (e) {
      print('Error during logout: $e');
      return false;
    }
  }

  // Clear error method
  void clearError() {
    _error = null;
    notifyListeners();
  }

  // Validate token on app startup
  Future<bool> validateTokenOnStartup() async {
    _isLoading = true;
    notifyListeners();

    try {
      final storage = const FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      final prefs = await SharedPreferences.getInstance();
      final role = prefs.getString('user_role');

      if (token == null || role == null) {
        return false;
      }

      final isValid = await _authService.validateToken(token, role);

      if (isValid) {
        await initialize();
      } else {
        await logout();
      }

      return isValid;
    } catch (e) {
      await logout();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
