import 'dart:convert';

import 'package:flutter/material.dart';

class Schedule {
  final String id;
  final String routeId;
  final String routeName;
  final String? driverId;
  final String? driverName;
  final List<String> dayOfWeek;
  final DateTime startTime;
  final DateTime endTime;
  final String status;
  final List<StopTime> stopTimes;
  final bool isRecurring;
  final bool isToday;
  final bool isPassed;
  final String formattedStartTime;
  final String formattedEndTime;
  final double? estimatedFare;

  Schedule({
    required this.id,
    required this.routeId,
    required this.routeName,
    this.driverId,
    this.driverName,
    required this.dayOfWeek,
    required this.startTime,
    required this.endTime,
    required this.status,
    required this.stopTimes,
    required this.isRecurring,
    required this.isToday,
    required this.isPassed,
    required this.formattedStartTime,
    required this.formattedEndTime,
    this.estimatedFare,
  });

  factory Schedule.fromJson(Map<String, dynamic> json) {
    try {
      // Handle routeId which could be either an object or just an ID
      String routeId = '';
      String routeName = 'Unknown Route';

      if (json['routeId'] != null) {
        if (json['routeId'] is Map) {
          final routeMap = json['routeId'] as Map;
          routeId = routeMap['_id']?.toString() ?? '';
          routeName = routeMap['name']?.toString() ?? 'Unknown Route';
        } else {
          routeId = json['routeId'].toString();
          routeName = json['routeName']?.toString() ?? 'Unknown Route';
        }
      }

      // Handle driverId which could be null, an object, or just an ID
      String? driverId;
      String? driverName;

      if (json['driverId'] != null) {
        if (json['driverId'] is Map) {
          final driverMap = json['driverId'] as Map;
          driverId = driverMap['_id']?.toString();
          driverName = driverMap['name']?.toString();
        } else {
          driverId = json['driverId'].toString();
          driverName = null;
        }
      }

      // Handle stop times safely
      List<StopTime> stopTimes = [];
      if (json['stopTimes'] != null && json['stopTimes'] is List) {
        stopTimes = (json['stopTimes'] as List)
            .map((x) => StopTime.fromJson(Map<String, dynamic>.from(x)))
            .toList();
      }

      // Parse date fields safely
      DateTime parseDateTime(dynamic value) {
        if (value == null) return DateTime.now();
        try {
          if (value is String) {
            return DateTime.parse(value);
          }
          return DateTime.now();
        } catch (e) {
          return DateTime.now();
        }
      }

      // Parse estimated fare safely
      double? parseFare(dynamic value) {
        if (value == null) return null;
        if (value is num) return value.toDouble();
        if (value is String) {
          try {
            return double.parse(value);
          } catch (e) {
            return null;
          }
        }
        return null;
      }

      return Schedule(
        id: json['_id']?.toString() ?? '',
        routeId: routeId,
        routeName: routeName,
        driverId: driverId,
        driverName: driverName,
        dayOfWeek: json['dayOfWeek'] != null
            ? List<String>.from(json['dayOfWeek'])
            : [],
        startTime: parseDateTime(json['startTime']),
        endTime: parseDateTime(json['endTime']),
        status: json['status']?.toString() ?? 'scheduled',
        stopTimes: stopTimes,
        isRecurring: json['isRecurring'] == true,
        isToday: json['isToday'] == true,
        isPassed: json['isPassed'] == true,
        formattedStartTime: json['formattedStartTime']?.toString() ?? '',
        formattedEndTime: json['formattedEndTime']?.toString() ?? '',
        estimatedFare: parseFare(json['estimatedFare']),
      );
    } catch (e) {
      print('Error parsing schedule JSON: $e');
      print('Problematic JSON: $json');

      // Return default schedule
      return Schedule(
        id: '',
        routeId: '',
        routeName: 'Error parsing schedule',
        dayOfWeek: [],
        startTime: DateTime.now(),
        endTime: DateTime.now(),
        status: 'error',
        stopTimes: [],
        isRecurring: false,
        isToday: false,
        isPassed: false,
        formattedStartTime: '',
        formattedEndTime: '',
        estimatedFare: null,
      );
    }
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'routeId': {'_id': routeId, 'name': routeName},
      'driverId':
          driverId != null ? {'_id': driverId, 'name': driverName} : null,
      'dayOfWeek': dayOfWeek,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime.toIso8601String(),
      'status': status,
      'stopTimes': stopTimes.map((x) => x.toJson()).toList(),
      'isRecurring': isRecurring,
      'isToday': isToday,
      'isPassed': isPassed,
      'formattedStartTime': formattedStartTime,
      'formattedEndTime': formattedEndTime,
      'estimatedFare': estimatedFare,
    };
  }

  String getStatusText() {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  Color getStatusColor() {
    switch (status) {
      case 'scheduled':
        return Colors.blue;
      case 'in-progress':
        return Colors.orange;
      case 'completed':
        return Colors.green;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}

class StopTime {
  final String stopId;
  final String stopName;
  final DateTime arrivalTime;
  final DateTime departureTime;

  StopTime({
    required this.stopId,
    required this.stopName,
    required this.arrivalTime,
    required this.departureTime,
  });

  factory StopTime.fromJson(Map<String, dynamic> json) {
    try {
      // Parse date fields safely
      DateTime parseDateTime(dynamic value) {
        if (value == null) return DateTime.now();
        try {
          if (value is String) {
            return DateTime.parse(value);
          }
          return DateTime.now();
        } catch (e) {
          return DateTime.now();
        }
      }

      return StopTime(
        stopId: json['stopId']?.toString() ?? '',
        stopName: json['stopName']?.toString() ?? 'Unknown Stop',
        arrivalTime: parseDateTime(json['arrivalTime']),
        departureTime:
            parseDateTime(json['departureTime'] ?? json['arrivalTime']),
      );
    } catch (e) {
      print('Error parsing stop time JSON: $e');
      // Return default stop time
      return StopTime(
        stopId: '',
        stopName: 'Error parsing stop',
        arrivalTime: DateTime.now(),
        departureTime: DateTime.now(),
      );
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'stopId': stopId,
      'stopName': stopName,
      'arrivalTime': arrivalTime.toIso8601String(),
      'departureTime': departureTime.toIso8601String(),
    };
  }
}
