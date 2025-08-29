import 'package:shared_preferences/shared_preferences.dart';

class SharedPrefs {
  static SharedPreferences? _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static Future<void> setToken(String token) async {
    await _prefs?.setString('auth_token', token);
  }

  static String? getToken() {
    return _prefs?.getString('auth_token');
  }

  static Future<void> setDriverId(String driverId) async {
    await _prefs?.setString('driver_id', driverId);
  }

  static String? getDriverId() {
    return _prefs?.getString('driver_id');
  }

  static Future<void> clearAll() async {
    await _prefs?.clear();
  }
}
