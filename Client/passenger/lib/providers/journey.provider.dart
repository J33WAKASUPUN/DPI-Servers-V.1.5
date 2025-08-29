import 'package:flutter/material.dart';
import 'package:location/location.dart';
import 'package:transit_lanka/core/models/journey.dart';
import 'package:transit_lanka/core/services/journey.service.dart';

class JourneyProvider with ChangeNotifier {
  final JourneyService _journeyService = JourneyService();

  // Driver journey tracking data
  JourneyTrackingData? _activeJourney;
  List<JourneyTrackingData> _journeyHistory = [];

  // Passenger journey data
  Journey? _activeTicket;
  List<Journey> _ticketHistory = [];

  bool _isTracking = false;
  bool _isLoading = false;
  String? _error;

  // Getters for driver journey
  JourneyTrackingData? get activeJourney => _activeJourney;
  List<JourneyTrackingData> get journeyHistory => _journeyHistory;

  // Getters for passenger tickets
  Journey? get activeTicket => _activeTicket;
  List<Journey> get ticketHistory => _ticketHistory;

  bool get isTracking => _isTracking;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Start a new journey (driver)
  Future<bool> startJourney(String scheduleId) async {
    _setLoading(true);
    try {
      final journey = await _journeyService.startJourney(scheduleId);
      if (journey != null) {
        _activeJourney = journey;
        _isTracking = true;
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      _error = 'Failed to start journey: $e';
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // End active journey (driver)
  Future<bool> endJourney() async {
    if (_activeJourney == null) return false;

    _setLoading(true);
    try {
      final success = await _journeyService.endJourney(_activeJourney!.id);
      if (success) {
        _isTracking = false;
        await loadJourneyHistory();
        _activeJourney = null;
        notifyListeners();
      }
      return success;
    } catch (e) {
      _error = 'Failed to end journey: $e';
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Mark checkpoint as completed (driver)
  Future<bool> completeCheckpoint(String stopId) async {
    if (_activeJourney == null) return false;

    _setLoading(true);
    try {
      final success =
          await _journeyService.completeCheckpoint(_activeJourney!.id, stopId);
      if (success) {
        // Update local journey data to reflect checkpoint completion
        await loadActiveJourney();
      }
      return success;
    } catch (e) {
      _error = 'Failed to complete checkpoint: $e';
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Load active journey if exists (driver)
  Future<void> loadActiveJourney() async {
    _setLoading(true);
    try {
      final journey = await _journeyService.getDriverActiveJourney();
      _activeJourney = journey;
      _isTracking = journey != null;
      _error = null;
    } catch (e) {
      _error = 'Failed to load active journey: $e';
    } finally {
      _setLoading(false);
    }
  }

  // Update driver location
  Future<bool> updateLocation(LocationData location) async {
    if (_activeJourney == null || !_isTracking) return false;

    try {
      return await _journeyService.updateDriverLocation(
          _activeJourney!.id, location);
    } catch (e) {
      _error = 'Failed to update location: $e';
      return false;
    }
  }

  // Load journey history (driver)
  Future<void> loadJourneyHistory() async {
    _setLoading(true);
    try {
      _journeyHistory = await _journeyService.getDriverJourneyHistory();
      _error = null;
    } catch (e) {
      _error = 'Failed to load journey history: $e';
    } finally {
      _setLoading(false);
    }
  }

  // Book a journey (passenger)
  Future<Map<String, dynamic>> bookJourney(
    String scheduleId,
    String paymentMethod,
    List<Map<String, dynamic>> additionalPassengers,
  ) async {
    _setLoading(true);
    try {
      final result = await _journeyService.bookJourney(
        scheduleId,
        paymentMethod,
        additionalPassengers,
      );

      // If booking was successful, refresh passenger tickets
      if (result['status'] == true) {
        await loadActiveTickets();
      }

      return result;
    } catch (e) {
      _error = 'Failed to book journey: $e';
      return {
        'status': false,
        'message': _error,
      };
    } finally {
      _setLoading(false);
    }
  }

  // Load active tickets (passenger)
  Future<void> loadActiveTickets() async {
    _setLoading(true);
    try {
      final tickets = await _journeyService.getActiveTickets();
      if (tickets != null) {
        _ticketHistory = tickets;
        _activeTicket = tickets.isNotEmpty ? tickets.first : null;
      }
      _error = null;
    } catch (e) {
      _error = 'Failed to load active tickets: $e';
    } finally {
      _setLoading(false);
    }
  }

  // Load ticket history (passenger)
  Future<void> loadTicketHistory({int page = 1, int limit = 10}) async {
    _setLoading(true);
    try {
      final tickets = await _journeyService.getCompletedTickets(
        page: page,
        limit: limit,
      );
      if (tickets != null) {
        _ticketHistory = tickets;
      }
      _error = null;
    } catch (e) {
      _error = 'Failed to load ticket history: $e';
    } finally {
      _setLoading(false);
    }
  }

  // Get journey details (passenger or driver)
  Future<Journey?> getJourneyDetails(String journeyId) async {
    _setLoading(true);
    try {
      final result = await _journeyService.getJourneyDetails(journeyId);
      if (result['status'] == true && result['data'] != null) {
        return Journey.fromJson(result['data']);
      }
      return null;
    } catch (e) {
      _error = 'Failed to get journey details: $e';
      return null;
    } finally {
      _setLoading(false);
    }
  }

  // Verify journey (driver)
  Future<bool> verifyJourney(String journeyId) async {
    _setLoading(true);
    try {
      final result = await _journeyService.verifyJourney(journeyId);
      return result['status'] == true;
    } catch (e) {
      _error = 'Failed to verify journey: $e';
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Cancel journey (passenger)
  Future<bool> cancelJourney(String journeyId) async {
    _setLoading(true);
    try {
      final result = await _journeyService.cancelJourney(journeyId);
      if (result['status'] == true) {
        // Refresh ticket data
        await loadActiveTickets();
        return true;
      }
      return false;
    } catch (e) {
      _error = 'Failed to cancel journey: $e';
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Process payment (passenger)
  Future<Map<String, dynamic>> initiatePayment(String journeyId) async {
    _setLoading(true);
    try {
      final result = await _journeyService.initiatePayment(journeyId);
      return result;
    } catch (e) {
      _error = 'Failed to initiate payment: $e';
      return {
        'status': false,
        'message': _error,
      };
    } finally {
      _setLoading(false);
    }
  }

  // Capture payment (passenger)
  Future<bool> capturePayment(String orderId) async {
    _setLoading(true);
    try {
      final result = await _journeyService.capturePayment(orderId);
      if (result['status'] == true) {
        await loadActiveTickets();
        return true;
      }
      return false;
    } catch (e) {
      _error = 'Failed to capture payment: $e';
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Set loading state
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  // Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }

  // Initialize provider based on user role
  Future<void> initialize(String role) async {
    if (role == 'driver') {
      await loadActiveJourney();
      await loadJourneyHistory();
    } else if (role == 'passenger') {
      await loadActiveTickets();
      await loadTicketHistory();
    }
  }
}
