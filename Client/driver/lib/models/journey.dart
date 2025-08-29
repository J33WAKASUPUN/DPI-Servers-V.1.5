class Journey {
  final String id;
  final String scheduleId;
  final String driverId;
  final DateTime? startTime;
  final DateTime? endTime;
  final String status;
  final List<LocationPoint>? route;

  Journey({
    required this.id,
    required this.scheduleId,
    required this.driverId,
    this.startTime,
    this.endTime,
    required this.status,
    this.route,
  });

  factory Journey.fromJson(Map<String, dynamic> json) {
    return Journey(
      id: json['id'] ?? '',
      scheduleId: json['scheduleId'] ?? '',
      driverId: json['driverId'] ?? '',
      startTime: json['startTime'] != null ? DateTime.parse(json['startTime']) : null,
      endTime: json['endTime'] != null ? DateTime.parse(json['endTime']) : null,
      status: json['status'] ?? '',
      route: json['route'] != null 
          ? (json['route'] as List).map((e) => LocationPoint.fromJson(e)).toList()
          : null,
    );
  }
}

class LocationPoint {
  final double latitude;
  final double longitude;
  final DateTime timestamp;

  LocationPoint({
    required this.latitude,
    required this.longitude,
    required this.timestamp,
  });

  factory LocationPoint.fromJson(Map<String, dynamic> json) {
    return LocationPoint(
      latitude: json['latitude']?.toDouble() ?? 0.0,
      longitude: json['longitude']?.toDouble() ?? 0.0,
      timestamp: DateTime.parse(json['timestamp'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'timestamp': timestamp.toIso8601String(),
    };
  }
}