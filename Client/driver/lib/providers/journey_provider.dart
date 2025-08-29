import 'dart:convert';
import 'package:flutter/material.dart';
import '../config/api.endpoints.dart';
import '../models/journey.dart';
import '../services/api_service.dart';

class JourneyProvider extends ChangeNotifier {
  Journey? _currentJourney;
  bool _isLoading = false;
  String? _error;

  Journey? get currentJourney => _currentJourney;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isJourneyActive =>
      _currentJourney?.status == 'active' ||
      _currentJourney?.status == 'started';

  Future<bool> startJourney(String scheduleId) async {
    _setLoading(true);
    _error = null;

    try {
      final response = await ApiService.post(
        ApiEndpoints.startJourney,
        {'scheduleId': scheduleId},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        // Create a journey object from the response
        _currentJourney = Journey(
          id: data['data']['journeyId'] ?? scheduleId,
          scheduleId: scheduleId,
          driverId: data['data']['driverId'] ?? '',
          status: 'started',
          startTime: DateTime.now(),
        );

        _setLoading(false);
        return true;
      } else {
        final errorData = json.decode(response.body);
        _error = errorData['message'] ?? 'Failed to start journey';
        _setLoading(false);
        return false;
      }
    } catch (e) {
      _error = 'Network error: ${e.toString()}';
      _setLoading(false);
      return false;
    }
  }

  Future<bool> endJourney() async {
    if (_currentJourney == null) return false;

    _setLoading(true);
    _error = null;

    try {
      // Use tracking stop endpoint to end journey
      final response = await ApiService.post(
        ApiEndpoints.trackingStop,
        {'scheduleId': _currentJourney!.scheduleId},
      );

      if (response.statusCode == 200) {
        _currentJourney = null;
        _setLoading(false);
        return true;
      } else {
        final errorData = json.decode(response.body);
        _error = errorData['message'] ?? 'Failed to end journey';
        _setLoading(false);
        return false;
      }
    } catch (e) {
      _error = 'Network error: ${e.toString()}';
      _setLoading(false);
      return false;
    }
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
