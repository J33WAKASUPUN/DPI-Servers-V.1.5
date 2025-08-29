import 'package:google_maps_flutter/google_maps_flutter.dart';

class RouteMapData {
  final String routeId;
  final String routeName;
  final List<StopLocation> stops;
  final List<LatLng> path;

  RouteMapData({
    required this.routeId,
    required this.routeName,
    required this.stops,
    required this.path,
  });

  factory RouteMapData.fromJson(Map<String, dynamic> json) {
    List<StopLocation> stops = [];
    List<LatLng> path = [];

    try {
      // Parse stops
      if (json['stops'] != null) {
        stops = (json['stops'] as List).map((x) {
          // Try to handle both formats - either direct or with nested location
          double lat = 0.0, lng = 0.0;

          if (x['location'] != null) {
            if (x['location'] is Map) {
              lat = double.tryParse(
                      x['location']['latitude']?.toString() ?? '0.0') ??
                  0.0;
              lng = double.tryParse(
                      x['location']['longitude']?.toString() ?? '0.0') ??
                  0.0;
            }
          } else if (x['coordinates'] != null) {
            // Alternative format
            lat = double.tryParse(x['coordinates'][1]?.toString() ?? '0.0') ??
                0.0;
            lng = double.tryParse(x['coordinates'][0]?.toString() ?? '0.0') ??
                0.0;
          }

          return StopLocation(
            stopId: x['stopId']?.toString() ?? x['_id']?.toString() ?? '',
            name: x['name'] ?? 'Unknown Stop',
            location: LatLng(lat, lng),
          );
        }).toList();
      }

      // Parse path
      if (json['path'] != null) {
        if (json['path'] is List) {
          path = (json['path'] as List)
              .map((point) {
                // Expects [longitude, latitude] format from backend
                try {
                  return LatLng(
                    double.parse(point[1].toString()),
                    double.parse(point[0].toString()),
                  );
                } catch (e) {
                  print('Error parsing point: $point - $e');
                  return LatLng(0, 0);
                }
              })
              .where((point) => point.latitude != 0 && point.longitude != 0)
              .toList();
        } else if (json['path']['coordinates'] != null) {
          path = (json['path']['coordinates'] as List)
              .map((point) {
                try {
                  return LatLng(
                    double.parse(point[1].toString()),
                    double.parse(point[0].toString()),
                  );
                } catch (e) {
                  print('Error parsing coordinate: $point - $e');
                  return LatLng(0, 0);
                }
              })
              .where((point) => point.latitude != 0 && point.longitude != 0)
              .toList();
        }
      }
    } catch (e) {
      print('Error parsing RouteMapData: $e');
    }

    return RouteMapData(
      routeId: json['routeId']?.toString() ?? '',
      routeName: json['routeName']?.toString() ?? 'Unknown Route',
      stops: stops,
      path: path,
    );
  }
}

class StopLocation {
  final String stopId;
  final String name;
  final LatLng location;
  final DateTime? scheduledTime;

  StopLocation({
    required this.stopId,
    required this.name,
    required this.location,
    this.scheduledTime,
  });

  factory StopLocation.fromJson(Map<String, dynamic> json) {
    // Handle different location formats
    LatLng getLocation() {
      if (json['location'] != null && json['location']['coordinates'] != null) {
        final coords = json['location']['coordinates'];
        // GeoJSON format: [longitude, latitude]
        return LatLng(
          double.parse(coords[1].toString()),
          double.parse(coords[0].toString()),
        );
      } else if (json['latitude'] != null && json['longitude'] != null) {
        return LatLng(
          double.parse(json['latitude'].toString()),
          double.parse(json['longitude'].toString()),
        );
      }
      // Default to 0,0 if no coordinates
      return const LatLng(0, 0);
    }

    return StopLocation(
      stopId: json['_id'] ?? json['stopId'] ?? '',
      name: json['name'] ?? '',
      location: getLocation(),
      scheduledTime: json['scheduledTime'] != null
          ? DateTime.parse(json['scheduledTime'])
          : null,
    );
  }
}

class DriverLocation {
  final String driverId;
  final String journeyId;
  final String scheduleId;
  final LatLng location;
  final double heading;
  final DateTime timestamp;

  DriverLocation({
    required this.driverId,
    required this.journeyId,
    required this.scheduleId,
    required this.location,
    required this.heading,
    required this.timestamp,
  });

  factory DriverLocation.fromJson(Map<String, dynamic> json) {
    return DriverLocation(
      driverId: json['driverId'] ?? '',
      journeyId: json['journeyId'] ?? '',
      scheduleId: json['scheduleId'] ?? '',
      location: LatLng(
        double.parse(json['latitude'].toString()),
        double.parse(json['longitude'].toString()),
      ),
      heading: double.parse(json['heading']?.toString() ?? '0'),
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'])
          : DateTime.now(),
    );
  }
}
