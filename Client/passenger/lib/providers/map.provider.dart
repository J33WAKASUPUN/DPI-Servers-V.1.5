import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:location/location.dart';
import 'package:transit_lanka/core/models/map.dart';
import 'package:transit_lanka/core/models/schedule.dart';

import 'package:transit_lanka/core/services/journey.service.dart';
import 'package:transit_lanka/core/services/map.service.dart';
import 'dart:async';

import 'package:transit_lanka/core/services/route.service.dart';
import 'package:transit_lanka/core/services/google_directions.service.dart';
import 'package:transit_lanka/core/services/osrm.service.dart';
import 'package:transit_lanka/core/utils/route_visualizer.dart';

class MapProvider with ChangeNotifier {
  final MapService _mapService = MapService();

  RouteMapData? _activeRoute;
  LocationData? _currentLocation;
  LocationData? _driverLocation;
  Map<String, Marker> _markers = {};
  Set<Polyline> _routePolylines = {};
  bool _isTracking = false;
  bool _isLoading = false;
  String? _error;

  // Add a timer for continuous location updates
  Timer? _locationUpdateTimer;

  // Add these properties to your MapProvider class
  Schedule? _selectedSchedule;
  bool _showRoutePath = true;

  // Getters
  RouteMapData? get activeRoute => _activeRoute;
  LocationData? get currentLocation => _currentLocation;
  LocationData? get driverLocation => _driverLocation;
  Set<Marker> get markers => _markers.values.toSet();
  Set<Polyline> get routePolylines => _routePolylines;
  bool get isTracking => _isTracking;
  bool get isLoading => _isLoading;
  String? get error => _error;
  Schedule? get selectedSchedule => _selectedSchedule;
  bool get showRoutePath => _showRoutePath;

  // Replace the loadRouteMapData method
  Future<bool> loadRouteMapData(String routeId) async {
    _setLoading(true);
    try {
      final routeData = await _mapService.getRouteMapData(routeId);

      if (routeData != null) {
        _activeRoute = routeData;

        // Fetch the actual road path using OSRM
        final routePath = await OSRMService.getDirections(
          points: _activeRoute!.stops.map((stop) => stop.location).toList(),
        );

        _activeRoute = RouteMapData(
          routeId: _activeRoute!.routeId,
          routeName: _activeRoute!.routeName,
          stops: _activeRoute!.stops,
          path: routePath, // Use the OSRM path
        );

        _setupRouteMarkers();
        _setupRoutePolylines();
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      print('Error loading route map data: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Replace the _getActualRoadPath method
  Future<List<LatLng>> _getActualRoadPath(List<StopLocation> stops) async {
    try {
      if (stops.isEmpty) return [];
      if (stops.length == 1) return [stops.first.location];

      // Extract stop locations
      final List<LatLng> stopLocations =
          stops.map((stop) => stop.location).toList();

      // Get directions from OSRM API
      final routePath = await OSRMService.getDirections(
        points: stopLocations,
        profile: 'driving', // Use car routing
      );

      print('Received route path with ${routePath.length} points from OSRM');
      return routePath;
    } catch (e) {
      print('Error creating actual road path: $e');
      // Fallback to straight lines
      return stops.map((stop) => stop.location).toList();
    }
  }

  // Get current location
  Future<bool> updateCurrentLocation() async {
    try {
      final location = await _mapService.getCurrentLocation();
      if (location != null) {
        _currentLocation = location;
        _updateDriverMarker();
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      _error = 'Failed to get current location: $e';
      return false;
    }
  }

  // Enhanced startTracking method with routeId parameter
  Future<void> startTracking(String routeId) async {
    try {
      // Load the route data if not already loaded or if a different route
      if (_activeRoute == null || _activeRoute?.routeId != routeId) {
        await loadRouteMapData(routeId);
      }

      // Get initial location
      await updateCurrentLocation();

      // Start tracking
      _isTracking = true;

      // Start a timer to update location regularly
      _locationUpdateTimer = Timer.periodic(Duration(seconds: 5), (_) async {
        if (_isTracking) {
          final success = await updateCurrentLocation();

          // If we have an active route, update the location on the server
          if (success && _activeRoute != null && _currentLocation != null) {
            try {
              final locationUpdated = await _mapService.updateDriverLocation(
                  _activeRoute!.routeId, _currentLocation!);

              if (!locationUpdated) {
                print('Failed to update driver location on server');
              }
            } catch (e) {
              print('Error in location update: $e');
              // Don't set _error here as it would show an error UI
              // Just log it to avoid disrupting the map experience
            }
          }
        }
      });

      notifyListeners();
    } catch (e) {
      _error = 'Failed to start tracking: $e';
      notifyListeners();
    }
  }

  // Override the stopTracking method to cancel the timer
  @override
  void stopTracking() {
    _isTracking = false;
    _locationUpdateTimer?.cancel();
    _locationUpdateTimer = null;
    notifyListeners();
  }

  // Set up markers for route stops
  void _setupRouteMarkers() {
    if (_activeRoute == null) return;

    _markers.clear();

    // Add stop markers
    for (int i = 0; i < _activeRoute!.stops.length; i++) {
      final stop = _activeRoute!.stops[i];
      final markerId = 'stop_${stop.stopId}';

      _markers[markerId] = Marker(
        markerId: MarkerId(markerId),
        position: stop.location,
        infoWindow: InfoWindow(
          title: stop.name,
          snippet: stop.scheduledTime != null
              ? 'Scheduled: ${_formatTime(stop.scheduledTime!)}'
              : null,
        ),
      );
    }

    // Add driver marker if available
    _updateDriverMarker();
  }

  // Set up polylines for route path
  void _setupRoutePolylines() {
    if (_activeRoute == null) return;

    _routePolylines = {
      Polyline(
        polylineId: PolylineId(_activeRoute!.routeId),
        points: _activeRoute!.path,
        color: Colors.blue,
        width: 5,
      ),
    };
  }

  // Update driver marker based on current location
  void _updateDriverMarker() {
    if (_currentLocation == null) return;

    final driverMarkerId = 'driver';
    _markers[driverMarkerId] = Marker(
      markerId: MarkerId(driverMarkerId),
      position: LatLng(
        _currentLocation!.latitude!,
        _currentLocation!.longitude!,
      ),
      rotation: _currentLocation!.heading ?? 0,
      icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
      infoWindow: const InfoWindow(
        title: 'Current Location',
        snippet: 'You are here',
      ),
    );
  }

  // Format time for display
  String _formatTime(DateTime time) {
    final hour = time.hour.toString().padLeft(2, '0');
    final minute = time.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
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

  // Add dispose method to ensure timer is cancelled
  @override
  void dispose() {
    _locationUpdateTimer?.cancel();
    super.dispose();
  }

  // For testing - add a method to get a route map
  Future<bool> getRouteMapData(String routeId) async {
    // In a real app, this would call an API service
    return await loadRouteMapData(routeId);
  }

  // Add this public method to the MapProvider class
  Future<bool> updateDriverLocationOnServer(
      String scheduleId, LocationData location) async {
    try {
      return await _mapService.updateDriverLocation(scheduleId, location);
    } catch (e) {
      _error = 'Error updating driver location: $e';
      print(_error);
      return false;
    }
  }

  // Add the new loadRoute method
  Future<void> loadRoute(String routeId) async {
    _setLoading(true);
    try {
      final routeData = await _mapService.getRouteMapData(routeId);
      if (routeData != null) {
        final routePath = await OSRMService.getDirections(
          points: routeData.stops.map((stop) => stop.location).toList(),
        );
        _activeRoute = RouteMapData(
          routeId: routeData.routeId,
          routeName: routeData.routeName,
          stops: routeData.stops,
          path: routePath,
        );
        _setupRoutePolylines();
        notifyListeners();
      }
    } finally {
      _setLoading(false);
    }
  }

  // Get passenger-specific markers (includes driver and stops)
  Set<Marker> get passengerMarkers {
    Set<Marker> markers = {};

    // Add stop markers
    if (activeRoute != null) {
      markers.addAll(RouteVisualizer.createStopMarkers(
        activeRoute!.stops,
        BitmapDescriptor.hueRed,
      ));
    }

    // Add driver marker with a more visible icon
    if (driverLocation != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('driver'),
          position: LatLng(
            driverLocation!.latitude!,
            driverLocation!.longitude!,
          ),
          icon:
              BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
          infoWindow: const InfoWindow(
            title: 'Bus Location',
            snippet: 'Your bus is here',
          ),
          rotation: driverLocation!.heading ?? 0,
          // Make it larger and more visible
          zIndex: 2, // Ensure it's on top of other markers
        ),
      );

      // Print debug info
      print(
          'Added driver marker at ${driverLocation!.latitude}, ${driverLocation!.longitude}');
    } else {
      print('Driver location is null, no marker added');
    }

    return markers;
  }

  // Refresh driver location for a specific schedule
  Future<bool> refreshDriverLocation(String scheduleId) async {
    if (scheduleId.isEmpty) {
      print('Cannot refresh driver location: scheduleId is empty');
      return false;
    }

    _setLoading(true);
    try {
      print('Requesting driver location for schedule: $scheduleId');

      final journeyService = JourneyService();
      final locationData = await journeyService.getDriverLocation(scheduleId);

      if (locationData != null) {
        print(
            'Received driver location: lat=${locationData.latitude}, lng=${locationData.longitude}');
        _driverLocation = locationData;
        notifyListeners();
        return true;
      } else {
        print('No driver location data received from API');
        return false;
      }
    } catch (e) {
      _error = 'Failed to get driver location: $e';
      print(_error);
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Add this method to your MapProvider class
  void updateDriverLocationFromSocket(LocationData locationData) {
    if (locationData.latitude == null || locationData.longitude == null) {
      print('Invalid location data received from socket');
      return;
    }

    print(
        'Updating driver location from socket: lat=${locationData.latitude}, lng=${locationData.longitude}');
    _driverLocation = locationData;
    notifyListeners();
  }

  // Set selected schedule
  void setSelectedSchedule(Schedule schedule) {
    _selectedSchedule = schedule;
    notifyListeners();
  }

  // Clear selected schedule
  void clearSelectedSchedule() {
    _selectedSchedule = null;
    notifyListeners();
  }

  // Toggle route path visibility
  void toggleRoutePath() {
    _showRoutePath = !_showRoutePath;
    _setupRoutePolylines();
    notifyListeners();
  }
}
