import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import 'package:location/location.dart';
import 'package:transit_lanka/core/models/schedule.dart';
import 'package:transit_lanka/core/providers/auth.provider.dart';
import 'package:transit_lanka/core/providers/map.provider.dart';
import 'package:transit_lanka/core/providers/schedule.provider.dart';
import 'package:transit_lanka/core/utils/map.utils.dart';
import 'package:transit_lanka/screens/passenger/screens/passenger_home_screen.dart';
import 'package:transit_lanka/screens/passenger/screens/payment.screen.dart';
import 'package:transit_lanka/screens/passenger/widgets/common/tab.bar.dart';
import 'package:transit_lanka/shared/constants/colors.dart';
import 'package:transit_lanka/core/utils/route_visualizer.dart';
import 'package:transit_lanka/core/services/socket.service.dart';

class MapScreen extends StatefulWidget {
  // ignore: use_super_parameters
  const MapScreen({Key? key}) : super(key: key);

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final Completer<GoogleMapController> _controller = Completer();
  Location _location = Location();
  bool _serviceEnabled = false;
  PermissionStatus? _permissionGranted;
  LocationData? _currentLocation;
  Set<Marker> _markers = {};
  Set<Polyline> _polylines = {};
  bool _showInfoPanel = true;
  bool _followDriverMode = false;
  Schedule? _selectedSchedule;
  Timer? _refreshTimer;
  final SocketService _socketService = SocketService();

  // Default center on Colombo, Sri Lanka
  static const CameraPosition _defaultLocation = CameraPosition(
    target: LatLng(6.9271, 79.8612),
    zoom: 13,
  );

  @override
  void initState() {
    super.initState();
    _checkLocationPermission();

    // Initialize data after widget is built
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeMapData();

      // Set up periodic refresh for driver location
      _startPeriodicRefresh();

      // Get auth provider and check if authenticated
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      if (authProvider.isAuthenticated && authProvider.token != null) {
        _socketService.init(authProvider.token!);
      }
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    // Unsubscribe from socket updates
    if (_selectedSchedule != null) {
      _socketService.unsubscribeFromJourneyLocation(_selectedSchedule!.id);
    }
    super.dispose();
  }

  // A better debug method for tracking issues
  void _debugLog(String message) {
    print('🔍 MapScreen: $message');
  }

  // Start periodic refresh of data
  void _startPeriodicRefresh() {
    // Cancel existing timer if any
    _refreshTimer?.cancel();

    // Set up a timer that refreshes the driver location every 3 seconds
    _refreshTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
      if (mounted && _selectedSchedule != null) {
        _refreshDriverLocation();
      }
    });
  }

  // Refresh the driver's location
  Future<void> _refreshDriverLocation() async {
    if (_selectedSchedule == null || !mounted) return;

    try {
      final mapProvider = Provider.of<MapProvider>(context, listen: false);
      final success =
          await mapProvider.refreshDriverLocation(_selectedSchedule!.id);

      if (success && mounted) {
        _debugLog('Driver location refreshed successfully');
        _updateMapVisualization(mapProvider);

        // Animate to driver if in follow mode
        if (_followDriverMode && mapProvider.driverLocation != null) {
          _animateToDriverLocation(mapProvider.driverLocation!);
        }
      } else if (mounted) {
        _debugLog('Failed to refresh driver location');
      }
    } catch (e) {
      _debugLog('Error in refresh driver location: $e');
    }
  }

  // In your location tracking method
  // ignore: unused_element
  Future<void> _updateDriverLocationOnServer() async {
    if (_currentLocation == null || _selectedSchedule == null) {
      _debugLog(
          'Cannot update location: currentLocation or selectedSchedule is null');
      return;
    }

    _debugLog('Updating location for schedule: ${_selectedSchedule!.id}');
    try {
      final mapProvider = Provider.of<MapProvider>(context, listen: false);
      final success = await mapProvider.updateDriverLocationOnServer(
          _selectedSchedule!.id, _currentLocation!);

      if (success) {
        _debugLog('Location updated successfully');
      } else {
        _debugLog('Failed to update location, but no exception was thrown');
      }
    } catch (e) {
      _debugLog('Error updating location: $e');
    }
  }

  // Initialize map data
  Future<void> _initializeMapData() async {
    final scheduleProvider =
        Provider.of<ScheduleProvider>(context, listen: false);

    // Check if there's a selected schedule
    final selectedSchedule = scheduleProvider.selectedSchedule;

    if (selectedSchedule != null) {
      setState(() {
        _selectedSchedule = selectedSchedule;
      });

      await _loadSelectedRouteData(selectedSchedule);
    }
  }

  // Load route data for selected schedule
  Future<void> _loadSelectedRouteData(Schedule schedule) async {
    if (schedule.id.isEmpty || schedule.routeId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invalid schedule data')),
      );
      return;
    }

    final mapProvider = Provider.of<MapProvider>(context, listen: false);

    // Load the route data
    final success = await mapProvider.loadRouteMapData(schedule.routeId);

    if (success && mounted) {
      // Get driver location for the schedule
      await mapProvider.refreshDriverLocation(schedule.id);

      // Subscribe to real-time location updates via socket
      _socketService.subscribeToJourneyLocation(
        schedule.id,
        (data) {
          // ignore: avoid_print
          print('Received driver location: $data');
          if (mounted && data != null && data['location'] != null) {
            final location = data['location'];
            if (location['coordinates'] != null &&
                location['coordinates'].length >= 2) {
              final driverLocation = LocationData.fromMap({
                'latitude': location['coordinates'][1],
                'longitude': location['coordinates'][0],
                'heading': location['bearing'] ?? 0.0,
              });

              mapProvider.updateDriverLocationFromSocket(driverLocation);

              // Create and add the custom bus marker
              _createBusMarker(driverLocation).then((busMarker) {
                if (mounted) {
                  setState(() {
                    _markers.removeWhere((marker) =>
                        marker.markerId == const MarkerId('driver'));
                    _markers.add(busMarker);
                  });
                }
              });
            }
          }
        },
      );

      // Update map visualization
      _updateMapVisualization(mapProvider);

      // If schedule is in progress and driver location is available, center on driver
      if (schedule.status == 'in-progress' &&
          mapProvider.driverLocation != null) {
        _animateToDriverLocation(mapProvider.driverLocation!);
        setState(() {
          _followDriverMode = true;
        });
      } else {
        // Otherwise zoom to show the entire route
        _animateToRouteBounds(mapProvider);
      }
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to load route data')),
      );
    }
  }

  // Check location permission
  Future<void> _checkLocationPermission() async {
    _serviceEnabled = await _location.serviceEnabled();
    if (!_serviceEnabled) {
      _serviceEnabled = await _location.requestService();
      if (!_serviceEnabled) {
        return;
      }
    }

    _permissionGranted = await _location.hasPermission();
    if (_permissionGranted == PermissionStatus.denied) {
      _permissionGranted = await _location.requestPermission();
      if (_permissionGranted != PermissionStatus.granted) {
        return;
      }
    }

    await _getCurrentLocation();
  }

  // Get current location
  Future<void> _getCurrentLocation() async {
    try {
      final locationData = await _location.getLocation();

      if (mounted) {
        setState(() {
          _currentLocation = locationData;
        });

        // Add the current location marker if no schedule is selected
        if (_selectedSchedule == null) {
          _animateToCurrentLocation();
        }
      }
    } catch (e) {
      _debugLog('Error getting location: $e');
    }
  }

  // Update map visualization with markers and polylines
  void _updateMapVisualization(MapProvider mapProvider) {
    if (!mounted) return;

    setState(() {
      // Get stops markers from provider
      _markers = mapProvider.passengerMarkers;

      // Create a copy of the driver marker with custom icon (if available)
      if (mapProvider.driverLocation != null) {
        _createBusMarker(mapProvider.driverLocation!).then((busMarker) {
          if (mounted) {
            setState(() {
              _markers.removeWhere(
                  (marker) => marker.markerId == const MarkerId('driver'));
              _markers.add(busMarker);
            });
          }
        });
      }

      _polylines = mapProvider.routePolylines;

      // Add current location marker
      if (_currentLocation != null) {
        _markers.add(
          Marker(
            markerId: const MarkerId('current_location'),
            position: LatLng(
              _currentLocation!.latitude!,
              _currentLocation!.longitude!,
            ),
            icon: BitmapDescriptor.defaultMarkerWithHue(
                BitmapDescriptor.hueAzure),
            infoWindow: const InfoWindow(
              title: 'Your Location',
              snippet: 'You are here',
            ),
          ),
        );
      }
    });
  }

  // Animate camera to current location
  Future<void> _animateToCurrentLocation() async {
    if (_currentLocation != null && _controller.isCompleted) {
      final controller = await _controller.future;
      controller.animateCamera(
        CameraUpdate.newLatLngZoom(
          LatLng(
            _currentLocation!.latitude!,
            _currentLocation!.longitude!,
          ),
          16, // Zoom level
        ),
      );
    }
  }

  // Animate to driver location
  Future<void> _animateToDriverLocation(LocationData driverLocation) async {
    if (_controller.isCompleted) {
      final controller = await _controller.future;
      controller.animateCamera(
        CameraUpdate.newLatLngZoom(
          LatLng(
            driverLocation.latitude!,
            driverLocation.longitude!,
          ),
          16, // Zoom level
        ),
      );
    }
  }

  // Animate to show the entire route
  Future<void> _animateToRouteBounds(MapProvider mapProvider) async {
    if (!_controller.isCompleted || mapProvider.activeRoute == null) return;

    final controller = await _controller.future;

    // Calculate bounds that include all stops and driver location
    final bounds = RouteVisualizer.calculateBounds(
      stops: mapProvider.activeRoute!.stops,
      driverLocation: mapProvider.driverLocation,
    );

    // Animate camera to show the entire route
    controller.animateCamera(
      CameraUpdate.newLatLngBounds(
        bounds,
        50.0, // Padding
      ),
    );
  }

  Future<Marker> _createBusMarker(LocationData driverLocation) async {
    print(
        'Creating bus marker at: ${driverLocation.latitude}, ${driverLocation.longitude}');
    final BitmapDescriptor busIcon = await MapUtils.bitmapDescriptorFromAsset(
      'assets/images/bus.png',
      width: 80,
      height: 80,
    );

    return Marker(
      markerId: const MarkerId('driver'),
      position: LatLng(
        driverLocation.latitude!,
        driverLocation.longitude!,
      ),
      icon: busIcon,
      rotation: driverLocation.heading ?? 0,
      anchor: const Offset(0.5, 0.5),
      infoWindow: const InfoWindow(
        title: 'Bus Location',
        snippet: 'Your bus is here',
      ),
      zIndex: 2,
    );
  }

  // Build map button
  Widget _buildMapButton(
      IconData icon, String tooltip, VoidCallback onPressed) {
    return FloatingActionButton.small(
      heroTag: tooltip, // Unique hero tag to prevent navigation conflicts
      onPressed: onPressed,
      backgroundColor: Colors.white,
      child: Icon(icon, color: AppColors.primary),
      tooltip: tooltip,
    );
  }

  // Format time
  String _formatTime(DateTime time) {
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
  }

  // Build route information panel
  Widget _buildRouteInfoPanel(MapProvider mapProvider) {
    if (_selectedSchedule == null) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
          boxShadow: [
            BoxShadow(
              color: Colors.black26,
              blurRadius: 8,
              offset: Offset(0, -2),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'No schedule selected',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Select a schedule from the schedules screen to view route tracking.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                // Find the PassengerHomeScreen state using the correct class name
                final homeScreenState =
                    context.findAncestorStateOfType<PassengerHomeScreenState>();

                if (homeScreenState != null) {
                  // Use the same method as in schedule screen to navigate to schedules tab
                  homeScreenState.selectTab(PassengerTabItem.routes);
                } else {
                  // Fallback - show instructions
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Error navigating to schedules'),
                    ),
                  );
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
              child: const Text('Go to Schedules'),
            ),
          ],
        ),
      );
    }

    final inProgress = _selectedSchedule!.status == 'in-progress';
    final driverAvailable = mapProvider.driverLocation != null;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
        boxShadow: [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 8,
            offset: Offset(0, -2),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'Route: ${_selectedSchedule!.routeName}',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () {
                  setState(() {
                    _showInfoPanel = false;
                  });
                },
              ),
            ],
          ),

          // Schedule info
          Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            width: double.infinity,
            child: Card(
              color: Colors.grey[100],
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Status: ${_selectedSchedule!.getStatusText()}',
                          style: TextStyle(
                            color: _selectedSchedule!.getStatusColor(),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'Time: ${_selectedSchedule!.formattedStartTime} - ${_selectedSchedule!.formattedEndTime}',
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text('Days: ${_selectedSchedule!.dayOfWeek.join(", ")}'),
                  ],
                ),
              ),
            ),
          ),

          // Driver status
          if (inProgress) ...[
            Container(
              margin: const EdgeInsets.symmetric(vertical: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: driverAvailable
                    ? Colors.green.withOpacity(0.1)
                    : Colors.orange.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: driverAvailable ? Colors.green : Colors.orange,
                  width: 1,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    driverAvailable ? Icons.gps_fixed : Icons.gps_not_fixed,
                    color: driverAvailable ? Colors.green : Colors.orange,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      driverAvailable
                          ? 'Driver location is being tracked in real-time'
                          : 'Waiting for driver location updates...',
                      style: TextStyle(
                        color: driverAvailable ? Colors.green : Colors.orange,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Bus journey status indicator
          if (inProgress) ...[
            Container(
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: driverAvailable
                    ? Colors.green.shade50
                    : Colors.orange.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: driverAvailable ? Colors.green : Colors.orange,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    driverAvailable ? Icons.directions_bus : Icons.schedule,
                    color: driverAvailable ? Colors.green : Colors.orange,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          driverAvailable
                              ? 'Bus route started'
                              : 'Waiting for bus to start',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: driverAvailable
                                ? Colors.green.shade800
                                : Colors.orange.shade800,
                          ),
                        ),
                        Text(
                          driverAvailable
                              ? 'Bus is currently on route - you can track it on the map'
                              : 'The bus has not started the journey yet',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Buy ticket button
          if (_selectedSchedule!.status != 'completed') ...[
            const SizedBox(height: 8),
            ElevatedButton.icon(
              onPressed: () {
                if (_selectedSchedule != null) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) =>
                          PaymentScreen(schedule: _selectedSchedule!),
                    ),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('No schedule selected')),
                  );
                }
              },
              icon: const Icon(Icons.confirmation_number),
              label: const Text('Buy Ticket'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 48),
              ),
            ),
          ],

          // Current stop info
          if (inProgress && _selectedSchedule!.stopTimes.isNotEmpty) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                Icon(Icons.location_on, color: AppColors.primary),
                const SizedBox(width: 8),
                const Text(
                  'Next Stops:',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 100,
              child: ListView.builder(
                itemCount: _selectedSchedule!.stopTimes.length,
                itemBuilder: (context, index) {
                  final stopTime = _selectedSchedule!.stopTimes[index];
                  final isPassed = _isPastStop(stopTime);
                  final isNow = _isCurrentStop(stopTime);

                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(
                      vertical: 8,
                      horizontal: 12,
                    ),
                    decoration: BoxDecoration(
                      color: isNow
                          ? AppColors.primaryLight.withOpacity(0.2)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isNow ? AppColors.primary : Colors.transparent,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 24,
                          height: 24,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: isPassed
                                ? Colors.grey
                                : isNow
                                    ? AppColors.primary
                                    : Colors.blue.shade200,
                            shape: BoxShape.circle,
                          ),
                          child: isPassed
                              ? const Icon(Icons.check,
                                  color: Colors.white, size: 16)
                              : Text(
                                  '${index + 1}',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                stopTime.stopName,
                                style: TextStyle(
                                  fontWeight: isNow
                                      ? FontWeight.bold
                                      : FontWeight.normal,
                                ),
                              ),
                              Text(
                                'Scheduled: ${_formatTime(stopTime.arrivalTime)}',
                                style: TextStyle(
                                  fontSize: 12,
                                  color:
                                      isNow ? AppColors.primary : Colors.grey,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (isNow)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Text(
                              'Next',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }

  // Check if a stop is the current one
  bool _isCurrentStop(StopTime stopTime) {
    if (_selectedSchedule?.status != 'in-progress') return false;

    final now = DateTime.now();
    final isToday = now.day == stopTime.arrivalTime.day &&
        now.month == stopTime.arrivalTime.month &&
        now.year == stopTime.arrivalTime.year;

    if (!isToday) return false;

    // Check if current time is within 15 minutes of the stop time
    final diff = now.difference(stopTime.arrivalTime).inMinutes;
    return diff >= -15 && diff <= 15;
  }

  // Check if a stop has been passed
  bool _isPastStop(StopTime stopTime) {
    if (_selectedSchedule?.status == 'completed') return true;
    if (_selectedSchedule?.status == 'scheduled') return false;

    final now = DateTime.now();
    return now.isAfter(stopTime.arrivalTime.add(const Duration(minutes: 15)));
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MapProvider>(
      builder: (context, mapProvider, child) {
        return Scaffold(
          body: Stack(
            children: [
              // Google Map
              GoogleMap(
                mapType: MapType.normal,
                initialCameraPosition: _defaultLocation,
                onMapCreated: (GoogleMapController controller) {
                  _controller.complete(controller);
                },
                myLocationEnabled: true,
                myLocationButtonEnabled: false,
                compassEnabled: true,
                markers: _markers,
                polylines: _polylines,
                zoomControlsEnabled: true,
              ),

              // Top right buttons
              Positioned(
                top: 50,
                right: 16,
                child: Column(
                  children: [
                    _buildMapButton(
                      Icons.my_location,
                      'My Location',
                      _animateToCurrentLocation,
                    ),
                    const SizedBox(height: 8),
                    if (_selectedSchedule != null) ...[
                      _buildMapButton(
                        Icons.map,
                        'Show Route',
                        () => _animateToRouteBounds(mapProvider),
                      ),
                      const SizedBox(height: 8),
                      if (mapProvider.driverLocation != null)
                        _buildMapButton(
                          _followDriverMode
                              ? Icons.near_me
                              : Icons.near_me_outlined,
                          _followDriverMode
                              ? 'Following Driver'
                              : 'Follow Driver',
                          () {
                            setState(() {
                              _followDriverMode = !_followDriverMode;
                            });
                            if (_followDriverMode &&
                                mapProvider.driverLocation != null) {
                              _animateToDriverLocation(
                                  mapProvider.driverLocation!);
                            }
                          },
                        ),
                      const SizedBox(height: 8),
                      _buildMapButton(
                        _showInfoPanel
                            ? Icons.keyboard_arrow_down
                            : Icons.keyboard_arrow_up,
                        _showInfoPanel ? 'Hide Details' : 'Show Details',
                        () {
                          setState(() {
                            _showInfoPanel = !_showInfoPanel;
                          });
                        },
                      ),
                    ],
                  ],
                ),
              ),

              // Bottom info panel
              if (_showInfoPanel)
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: _buildRouteInfoPanel(mapProvider),
                ),

              // Bottom info panel - No schedule selected
              if (_selectedSchedule == null)
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius:
                          const BorderRadius.vertical(top: Radius.circular(16)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black26,
                          blurRadius: 8,
                          offset: Offset(0, -2),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'No schedule selected',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Select a schedule from the schedules screen to view route tracking.',
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () {
                            // Find the PassengerHomeScreen state using the correct class name
                            final homeScreenState =
                                context.findAncestorStateOfType<
                                    PassengerHomeScreenState>();

                            if (homeScreenState != null) {
                              // Use the same method as in schedule screen to navigate to schedules tab
                              homeScreenState
                                  .selectTab(PassengerTabItem.routes);
                            } else {
                              // Fallback - show instructions
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content:
                                      Text('Error navigating to schedules'),
                                ),
                              );
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                          ),
                          child: const Text('Go to Schedules'),
                        ),
                      ],
                    ),
                  ),
                ),

              // Loading indicator when map is refreshing
              if (mapProvider.isLoading)
                Positioned(
                  top: 120,
                  right: 16,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.7),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          'Updating',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
