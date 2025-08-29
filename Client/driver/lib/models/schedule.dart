class Schedule {
  final String id;
  final String routeName;
  final String startLocation;
  final String endLocation;
  final DateTime scheduledTime;
  final String status;
  final String? busNumber;
  final double? estimatedDuration;

  Schedule({
    required this.id,
    required this.routeName,
    required this.startLocation,
    required this.endLocation,
    required this.scheduledTime,
    required this.status,
    this.busNumber,
    this.estimatedDuration,
  });

  factory Schedule.fromJson(Map<String, dynamic> json) {
    return Schedule(
      id: json['id'] ?? '',
      routeName: json['routeName'] ?? '',
      startLocation: json['startLocation'] ?? '',
      endLocation: json['endLocation'] ?? '',
      scheduledTime: DateTime.parse(json['scheduledTime'] ?? DateTime.now().toIso8601String()),
      status: json['status'] ?? '',
      busNumber: json['busNumber'],
      estimatedDuration: json['estimatedDuration']?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'routeName': routeName,
      'startLocation': startLocation,
      'endLocation': endLocation,
      'scheduledTime': scheduledTime.toIso8601String(),
      'status': status,
      'busNumber': busNumber,
      'estimatedDuration': estimatedDuration,
    };
  }
}