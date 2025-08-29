// Original Journey model renamed to JourneyTrackingData
class JourneyTrackingData {
  final String id;
  final String scheduleId;
  final String driverId;
  final String routeId;
  final DateTime startTime;
  final DateTime? endTime;
  final String status;
  final List<JourneyCheckpoint> checkpoints;

  JourneyTrackingData({
    required this.id,
    required this.scheduleId,
    required this.driverId,
    required this.routeId,
    required this.startTime,
    this.endTime,
    required this.status,
    required this.checkpoints,
  });

  factory JourneyTrackingData.fromJson(Map<String, dynamic> json) {
    return JourneyTrackingData(
      id: json['_id'] ?? '',
      scheduleId: json['scheduleId'] ?? '',
      driverId: json['driverId'] ?? '',
      routeId: json['routeId'] ?? '',
      startTime: json['startTime'] != null
          ? DateTime.parse(json['startTime'])
          : DateTime.now(),
      endTime: json['endTime'] != null ? DateTime.parse(json['endTime']) : null,
      status: json['status'] ?? 'pending',
      checkpoints: json['checkpoints'] != null
          ? List<JourneyCheckpoint>.from(
              json['checkpoints'].map((x) => JourneyCheckpoint.fromJson(x)))
          : [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'scheduleId': scheduleId,
      'driverId': driverId,
      'routeId': routeId,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime?.toIso8601String(),
      'status': status,
      'checkpoints': checkpoints.map((x) => x.toJson()).toList(),
    };
  }
}

class JourneyCheckpoint {
  final String stopId;
  final String stopName;
  final DateTime scheduledTime;
  final DateTime? actualTime;
  final bool isCompleted;
  final Map<String, dynamic> location;

  JourneyCheckpoint({
    required this.stopId,
    required this.stopName,
    required this.scheduledTime,
    this.actualTime,
    required this.isCompleted,
    required this.location,
  });

  factory JourneyCheckpoint.fromJson(Map<String, dynamic> json) {
    return JourneyCheckpoint(
      stopId: json['stopId'] ?? '',
      stopName: json['stopName'] ?? '',
      scheduledTime: json['scheduledTime'] != null
          ? DateTime.parse(json['scheduledTime'])
          : DateTime.now(),
      actualTime: json['actualTime'] != null
          ? DateTime.parse(json['actualTime'])
          : null,
      isCompleted: json['isCompleted'] ?? false,
      location: json['location'] ?? {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'stopId': stopId,
      'stopName': stopName,
      'scheduledTime': scheduledTime.toIso8601String(),
      'actualTime': actualTime?.toIso8601String(),
      'isCompleted': isCompleted,
      'location': location,
    };
  }
}

// New Journey model for passenger ticketing
class Journey {
  final String id;
  final String status;
  final String paymentStatus;
  final String paymentMethod;
  final RouteDetails routeDetails;
  final DateTime startTime;
  final DateTime endTime;
  final double fare;
  final String? ticketNumber;
  final String? qrCode;
  final Map<String, dynamic>? additionalPassengerInfo;

  Journey({
    required this.id,
    required this.status,
    required this.paymentStatus,
    required this.paymentMethod,
    required this.routeDetails,
    required this.startTime,
    required this.endTime,
    required this.fare,
    this.ticketNumber,
    this.qrCode,
    this.additionalPassengerInfo,
  });

  factory Journey.fromJson(Map<String, dynamic> json) {
    return Journey(
      id: json['_id'] ?? '',
      status: json['status'] ?? 'unknown',
      paymentStatus: json['paymentStatus'] ?? 'unknown',
      paymentMethod: json['paymentMethod'] ?? 'unknown',
      routeDetails: RouteDetails.fromJson(json['routeDetails'] ?? {}),
      startTime: json['startTime'] != null
          ? DateTime.parse(json['startTime'])
          : DateTime.now(),
      endTime: json['endTime'] != null
          ? DateTime.parse(json['endTime'])
          : DateTime.now().add(const Duration(hours: 1)),
      fare: json['fare']?.toDouble() ?? 0.0,
      ticketNumber: json['ticketNumber'],
      qrCode: json['qrCode'],
      additionalPassengerInfo: json['additionalPassengerInfo'],
    );
  }

  // Add toJson method needed for API calls
  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'status': status,
      'paymentStatus': paymentStatus,
      'paymentMethod': paymentMethod,
      'routeDetails': {
        'routeId': routeDetails.routeId,
        'routeName': routeDetails.routeName,
        'startLocation': routeDetails.startLocation?.toJson(),
        'endLocation': routeDetails.endLocation?.toJson(),
      },
      'startTime': startTime.toIso8601String(),
      'endTime': endTime.toIso8601String(),
      'fare': fare,
      'ticketNumber': ticketNumber,
      'qrCode': qrCode,
      'additionalPassengerInfo': additionalPassengerInfo,
    };
  }
}

class RouteDetails {
  final String routeId;
  final String routeName;
  final LocationInfo? startLocation;
  final LocationInfo? endLocation;

  RouteDetails({
    required this.routeId,
    required this.routeName,
    this.startLocation,
    this.endLocation,
  });

  factory RouteDetails.fromJson(Map<String, dynamic> json) {
    return RouteDetails(
      routeId: json['routeId'] ?? '',
      routeName: json['routeName'] ?? 'Unknown Route',
      startLocation: json['startLocation'] != null
          ? LocationInfo.fromJson(json['startLocation'])
          : null,
      endLocation: json['endLocation'] != null
          ? LocationInfo.fromJson(json['endLocation'])
          : null,
    );
  }

  // Add toJson method for nested serialization
  Map<String, dynamic> toJson() {
    return {
      'routeId': routeId,
      'routeName': routeName,
      'startLocation': startLocation?.toJson(),
      'endLocation': endLocation?.toJson(),
    };
  }
}

class LocationInfo {
  final String name;
  final List<double>? coordinates;

  LocationInfo({
    required this.name,
    this.coordinates,
  });

  factory LocationInfo.fromJson(Map<String, dynamic> json) {
    List<double>? coords;
    if (json['coordinates'] != null && json['coordinates'] is List) {
      coords = (json['coordinates'] as List)
          .map((e) => e is int ? e.toDouble() : e as double)
          .toList();
    }

    return LocationInfo(
      name: json['name'] ?? 'Unknown',
      coordinates: coords,
    );
  }

  // Add toJson method for nested serialization
  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'coordinates': coordinates,
    };
  }
}
