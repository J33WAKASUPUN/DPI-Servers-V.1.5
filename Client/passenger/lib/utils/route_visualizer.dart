import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:transit_lanka/core/models/map.dart';
import 'package:location/location.dart';
import 'dart:math' as math;

class RouteVisualizer {
  // Create markers for route visualization
  static Set<Marker> createRouteMarkers({
    required RouteMapData route,
    required int currentStopIndex,
    LocationData? driverLocation,
  }) {
    final markers = <Marker>{};

    // Add stop markers
    for (int i = 0; i < route.stops.length; i++) {
      final stop = route.stops[i];
      final isNextStop = i == currentStopIndex;
      final isVisited = i < currentStopIndex;

      // Choose marker color based on status
      final hue = isNextStop
          ? BitmapDescriptor.hueGreen
          : (isVisited ? BitmapDescriptor.hueYellow : BitmapDescriptor.hueRed);

      markers.add(
        Marker(
          markerId: MarkerId('stop_${stop.stopId}'),
          position: stop.location,
          icon: BitmapDescriptor.defaultMarkerWithHue(hue),
          infoWindow: InfoWindow(
            title: stop.name,
            snippet: stop.scheduledTime != null
                ? 'Scheduled: ${_formatTime(stop.scheduledTime!)}'
                : 'Bus Stop',
          ),
        ),
      );
    }

    // Add driver marker if available
    if (driverLocation != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('driver'),
          position: LatLng(
            driverLocation.latitude!,
            driverLocation.longitude!,
          ),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
          rotation: driverLocation.heading ?? 0,
          infoWindow: const InfoWindow(
            title: 'Current Location',
            snippet: 'Driver is here',
          ),
        ),
      );
    }

    return markers;
  }

  // Create markers for stops
  static Set<Marker> createStopMarkers(
    List<StopLocation> stops,
    double markerHue,
  ) {
    final markers = <Marker>{};

    for (int i = 0; i < stops.length; i++) {
      final stop = stops[i];
      markers.add(
        Marker(
          markerId: MarkerId('stop_${stop.stopId}'),
          position: stop.location,
          icon: BitmapDescriptor.defaultMarkerWithHue(markerHue),
          infoWindow: InfoWindow(
            title: stop.name,
            snippet: stop.scheduledTime != null
                ? 'Scheduled: ${_formatTime(stop.scheduledTime!)}'
                : 'Bus Stop',
          ),
        ),
      );
    }

    return markers;
  }

  // Create polylines for route visualization
  static Set<Polyline> createRoutePolylines({
    required RouteMapData route,
    required int currentStopIndex,
    LocationData? driverLocation,
    Color routeColor = Colors.blue,
    Color progressColor = Colors.green,
  }) {
    final polylines = <Polyline>{};

    if (route.path.isEmpty) {
      return polylines;
    }

    // If driver location is available, create two polylines:
    // 1. Completed part (from first stop to driver location)
    // 2. Remaining part (from driver location to last stop)
    if (driverLocation != null) {
      // Find the nearest point on the route to the driver's location
      final driverLatLng = LatLng(
        driverLocation.latitude!,
        driverLocation.longitude!,
      );

      int nearestPointIndex = 0;
      double minDistance = double.infinity;

      for (int i = 0; i < route.path.length; i++) {
        final distance = calculateDistance(driverLatLng, route.path[i]);
        if (distance < minDistance) {
          minDistance = distance;
          nearestPointIndex = i;
        }
      }

      // Create the completed part polyline
      if (nearestPointIndex > 0) {
        List<LatLng> completedPath =
            route.path.sublist(0, nearestPointIndex + 1);
        completedPath.add(driverLatLng); // Add driver's exact position

        polylines.add(
          Polyline(
            polylineId: const PolylineId('route_completed'),
            points: completedPath,
            color: progressColor,
            width: 5,
          ),
        );
      }

      // Create the remaining part polyline
      List<LatLng> remainingPath = [driverLatLng];
      remainingPath.addAll(route.path.sublist(nearestPointIndex));

      polylines.add(
        Polyline(
          polylineId: const PolylineId('route_remaining'),
          points: remainingPath,
          color: routeColor,
          width: 5,
        ),
      );
    }
    // If driver location is not available, just show the full route
    else {
      polylines.add(
        Polyline(
          polylineId: const PolylineId('route_full'),
          points: route.path,
          color: routeColor,
          width: 5,
        ),
      );
    }

    return polylines;
  }

  // Calculate camera bounds to show all route points
  static LatLngBounds calculateBounds({
    required List<StopLocation> stops,
    LocationData? driverLocation,
  }) {
    double minLat = 90.0;
    double maxLat = -90.0;
    double minLng = 180.0;
    double maxLng = -180.0;

    // Include all stops in bounds
    for (final stop in stops) {
      minLat = math.min(minLat, stop.location.latitude);
      maxLat = math.max(maxLat, stop.location.latitude);
      minLng = math.min(minLng, stop.location.longitude);
      maxLng = math.max(maxLng, stop.location.longitude);
    }

    // Include driver location in bounds if available
    if (driverLocation != null) {
      minLat = math.min(minLat, driverLocation.latitude!);
      maxLat = math.max(maxLat, driverLocation.latitude!);
      minLng = math.min(minLng, driverLocation.longitude!);
      maxLng = math.max(maxLng, driverLocation.longitude!);
    }

    // Add padding
    final latPadding = (maxLat - minLat) * 0.1;
    final lngPadding = (maxLng - minLng) * 0.1;

    return LatLngBounds(
      southwest: LatLng(minLat - latPadding, minLng - lngPadding),
      northeast: LatLng(maxLat + latPadding, maxLng + lngPadding),
    );
  }

  // Helper method to format time
  static String _formatTime(DateTime time) {
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
  }

  // Helper method to calculate distance between two points using Haversine formula
  static double calculateDistance(LatLng p1, LatLng p2) {
    const double earthRadius = 6371000; // Earth's radius in meters

    final lat1 = p1.latitude * math.pi / 180;
    final lat2 = p2.latitude * math.pi / 180;
    final dLat = (p2.latitude - p1.latitude) * math.pi / 180;
    final dLon = (p2.longitude - p1.longitude) * math.pi / 180;

    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1) *
            math.cos(lat2) *
            math.sin(dLon / 2) *
            math.sin(dLon / 2);

    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return earthRadius * c; // Returns distance in meters
  }
}
