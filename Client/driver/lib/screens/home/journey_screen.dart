import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/schedule_provider.dart';
import '../../providers/journey_provider.dart';
import '../../providers/location_provider.dart';
import 'home_screen.dart';

class JourneyScreen extends StatefulWidget {
  const JourneyScreen({Key? key}) : super(key: key);

  @override
  State<JourneyScreen> createState() => _JourneyScreenState();
}

class _JourneyScreenState extends State<JourneyScreen> {
  GoogleMapController? _mapController;
  final Completer<GoogleMapController> _controller = Completer();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _startLocationTracking();
    });
  }

  Future<void> _startLocationTracking() async {
    final locationProvider = Provider.of<LocationProvider>(context, listen: false);
    final scheduleProvider = Provider.of<ScheduleProvider>(context, listen: false);
    
    final selectedSchedule = scheduleProvider.selectedSchedule;
    if (selectedSchedule != null && !locationProvider.isTracking) {
      await locationProvider.startTracking(selectedSchedule.id);
    }
  }

  Future<void> _endJourney() async {
    final journeyProvider = Provider.of<JourneyProvider>(context, listen: false);
    final locationProvider = Provider.of<LocationProvider>(context, listen: false);
    final scheduleProvider = Provider.of<ScheduleProvider>(context, listen: false);

    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('End Journey'),
        content: const Text('Are you sure you want to end this journey?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorRed),
            child: const Text('End Journey'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final selectedSchedule = scheduleProvider.selectedSchedule;
      if (selectedSchedule != null) {
        await locationProvider.stopTracking(selectedSchedule.id);
      }
      
      final success = await journeyProvider.endJourney();
      
      if (success && mounted) {
        scheduleProvider.clearSelectedSchedule();
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (context) => const HomeScreen()),
          (route) => false,
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(journeyProvider.error ?? 'Failed to end journey'),
            backgroundColor: AppTheme.errorRed,
          ),
        );
      }
    }
  }

  void _onMapCreated(GoogleMapController controller) {
    _controller.complete(controller);
    _mapController = controller;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Journey Tracking'),
        leading: IconButton(
          icon: const Icon(Icons.home),
          onPressed: () {
            Navigator.pushAndRemoveUntil(
              context,
              MaterialPageRoute(builder: (context) => const HomeScreen()),
              (route) => false,
            );
          },
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.stop, color: AppTheme.errorRed),
            onPressed: _endJourney,
          ),
        ],
      ),
      body: Consumer3<ScheduleProvider, JourneyProvider, LocationProvider>(
        builder: (context, scheduleProvider, journeyProvider, locationProvider, child) {
          final selectedSchedule = scheduleProvider.selectedSchedule;
          final currentPosition = locationProvider.currentPosition;

          return Column(
            children: [
              // Journey Info Card
              if (selectedSchedule != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  color: AppTheme.surfaceDark,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        selectedSchedule.routeName,
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.location_on, color: AppTheme.successGreen, size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              '${selectedSchedule.startLocation} → ${selectedSchedule.endLocation}',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Icon(
                                locationProvider.isTracking ? Icons.gps_fixed : Icons.gps_off,
                                color: locationProvider.isTracking ? AppTheme.successGreen : AppTheme.errorRed,
                                size: 16,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                locationProvider.isTracking ? 'Live Tracking' : 'Tracking Disabled',
                                style: TextStyle(
                                  color: locationProvider.isTracking ? AppTheme.successGreen : AppTheme.errorRed,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          if (selectedSchedule.busNumber != null) ...[
                            Text(
                              'Bus: ${selectedSchedule.busNumber}',
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ],

              // Map View
              Expanded(
                child: currentPosition != null
                    ? GoogleMap(
                        onMapCreated: _onMapCreated,
                        initialCameraPosition: CameraPosition(
                          target: LatLng(
                            currentPosition.latitude,
                            currentPosition.longitude,
                          ),
                          zoom: 16,
                        ),
                        markers: {
                          Marker(
                            markerId: const MarkerId('current_location'),
                            position: LatLng(
                              currentPosition.latitude,
                              currentPosition.longitude,
                            ),
                            infoWindow: const InfoWindow(title: 'Your Location'),
                            icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
                          ),
                        },
                        myLocationEnabled: true,
                        myLocationButtonEnabled: true,
                        mapType: MapType.normal,
                        compassEnabled: true,
                        trafficEnabled: true,
                      )
                    : const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            CircularProgressIndicator(),
                            SizedBox(height: 16),
                            Text('Getting your location...'),
                          ],
                        ),
                      ),
              ),

              // Bottom Controls
              Container(
                padding: const EdgeInsets.all(16),
                color: AppTheme.surfaceDark,
                child: Column(
                  children: [
                    if (locationProvider.error != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: AppTheme.errorRed.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppTheme.errorRed),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error, color: AppTheme.errorRed),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                locationProvider.error!,
                                style: const TextStyle(color: AppTheme.errorRed),
                              ),
                            ),
                            TextButton(
                              onPressed: locationProvider.clearError,
                              child: const Text('Dismiss'),
                            ),
                          ],
                        ),
                      ),
                    ],
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: locationProvider.isTracking
                                ? null
                                : () {
                                    if (selectedSchedule != null) {
                                      locationProvider.startTracking(selectedSchedule.id);
                                    }
                                  },
                            icon: const Icon(Icons.play_arrow),
                            label: const Text('Start Tracking'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.successGreen,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _endJourney,
                            icon: const Icon(Icons.stop),
                            label: const Text('End Journey'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.errorRed,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (currentPosition != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        'Current Location: ${currentPosition.latitude.toStringAsFixed(6)}, ${currentPosition.longitude.toStringAsFixed(6)}',
                        style: Theme.of(context).textTheme.bodySmall,
                        textAlign: TextAlign.center,
                      ),
                      Text(
                        'Speed: ${currentPosition.speed.toStringAsFixed(1)} m/s | Accuracy: ${currentPosition.accuracy.toStringAsFixed(1)}m',
                        style: Theme.of(context).textTheme.bodySmall,
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }
}