import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../config/api.endpoints.dart';
import '../services/api_service.dart';

class LocationProvider extends ChangeNotifier {
  Position? _currentPosition;
  bool _isTracking = false;
  StreamSubscription<Position>? _positionStreamSubscription;
  String? _error;

  Position? get currentPosition => _currentPosition;
  bool get isTracking => _isTracking;
  String? get error => _error;

  Future<bool> requestLocationPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _error = 'Location services are disabled.';
      notifyListeners();
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _error = 'Location permissions are denied';
        notifyListeners();
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      _error = 'Location permissions are permanently denied.';
      notifyListeners();
      return false;
    }

    return true;
  }

  Future<void> startTracking(String scheduleId) async {
    if (!await requestLocationPermission()) return;

    _isTracking = true;
    _error = null;
    notifyListeners();

    try {
      await ApiService.post(
          ApiEndpoints.trackingStart, {'scheduleId': scheduleId});
    } catch (e) {
      _error = 'Failed to start tracking: ${e.toString()}';
      notifyListeners();
    }

    const LocationSettings locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10, // Update every 10 meters
    );

    _positionStreamSubscription = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen(
      (Position position) {
        _currentPosition = position;
        _updateLocationOnServer(scheduleId, position);
        notifyListeners();
      },
      onError: (error) {
        _error = 'Location tracking error: ${error.toString()}';
        notifyListeners();
      },
    );
  }

  Future<void> _updateLocationOnServer(
      String scheduleId, Position position) async {
    try {
      await ApiService.post(
        ApiEndpoints.trackingUpdate,
        {
          'scheduleId': scheduleId,
          'latitude': position.latitude,
          'longitude': position.longitude,
          'bearing': position.heading,
          'speed': position.speed,
          'accuracy': position.accuracy,
          'timestamp': DateTime.now().toIso8601String(),
        },
      );
    } catch (e) {
      // Ignore individual update errors to avoid stopping tracking
      print('Location update error: $e');
    }
  }

  Future<void> stopTracking(String scheduleId) async {
    _isTracking = false;
    await _positionStreamSubscription?.cancel();
    _positionStreamSubscription = null;

    try {
      await ApiService.post(
          ApiEndpoints.trackingStop, {'scheduleId': scheduleId});
    } catch (e) {
      _error = 'Failed to stop tracking: ${e.toString()}';
    }

    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _positionStreamSubscription?.cancel();
    super.dispose();
  }
}
