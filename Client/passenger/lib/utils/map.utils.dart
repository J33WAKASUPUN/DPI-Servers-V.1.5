import 'dart:ui';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'dart:ui' as ui;
import 'dart:typed_data';
import 'package:flutter/services.dart';
import 'dart:math' as math;
import 'package:path_provider/path_provider.dart';
// import 'package:share_plus/share_plus.dart';
import 'package:permission_handler/permission_handler.dart';

class MapUtils {
  // Convert list of coordinates to LatLng list for Google Maps
  static List<LatLng> decodePolyline(String encoded) {
    List<LatLng> points = [];
    int index = 0, len = encoded.length;
    int lat = 0, lng = 0;

    while (index < len) {
      int b, shift = 0, result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1F) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1F) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.add(LatLng(lat / 1E5, lng / 1E5));
    }
    return points;
  }

  // Calculate bounds for a list of LatLng points
  static LatLngBounds getBounds(List<LatLng> points) {
    double minLat = points.first.latitude;
    double maxLat = points.first.latitude;
    double minLng = points.first.longitude;
    double maxLng = points.first.longitude;

    for (var point in points) {
      if (point.latitude < minLat) minLat = point.latitude;
      if (point.latitude > maxLat) maxLat = point.latitude;
      if (point.longitude < minLng) minLng = point.longitude;
      if (point.longitude > maxLng) maxLng = point.longitude;
    }

    return LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );
  }

  // Calculate distance between two coordinates in kilometers
  static double calculateDistance(LatLng point1, LatLng point2) {
    const int earthRadius = 6371; // Earth's radius in kilometers
    double lat1 = point1.latitude * (pi / 180);
    double lat2 = point2.latitude * (pi / 180);
    double lon1 = point1.longitude * (pi / 180);
    double lon2 = point1.longitude * (pi / 180);
    double dLat = lat2 - lat1;
    double dLon = lon2 - lon1;

    double a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1) * cos(lat2) * sin(dLon / 2) * sin(dLon / 2);
    double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return earthRadius * c;
  }

  // Create custom marker bitmap from widget
  static Future<BitmapDescriptor> createCustomMarkerBitmap(Widget widget,
      {Size size = const Size(100, 100)}) async {
    final pictureRecorder = ui.PictureRecorder();
    final canvas = Canvas(pictureRecorder);
    final recorder = PictureRecorder();

    final customPainter = _CustomMarkerPainter(widget, size);
    customPainter.paint(canvas, size);

    final picture = pictureRecorder.endRecording();
    final img = await picture.toImage(size.width.toInt(), size.height.toInt());
    final byteData = await img.toByteData(format: ui.ImageByteFormat.png);
    final Uint8List pngBytes = byteData!.buffer.asUint8List();

    return BitmapDescriptor.fromBytes(pngBytes);
  }

  // Load custom marker from asset
  static Future<BitmapDescriptor> bitmapDescriptorFromAsset(String assetName,
      {int width = 100, int height = 100}) async {
    print('Loading asset: $assetName');
    final ByteData data = await rootBundle.load(assetName);
    final ui.Codec codec = await ui.instantiateImageCodec(
      data.buffer.asUint8List(),
      targetWidth: width,
      targetHeight: height,
    );

    final ui.FrameInfo fi = await codec.getNextFrame();
    final ByteData? byteData =
        await fi.image.toByteData(format: ui.ImageByteFormat.png);

    final Uint8List resizedImageBytes = byteData!.buffer.asUint8List();
    return BitmapDescriptor.fromBytes(resizedImageBytes);
  }

  // Generate GPX from a list of LatLng points
  static String generateGPX(List<LatLng> points) {
    final buffer = StringBuffer();
    buffer.writeln('<?xml version="1.0" encoding="UTF-8"?>');
    buffer.writeln('<gpx version="1.1" creator="TransitLanka">');
    for (final point in points) {
      buffer.writeln(
          '<wpt lat="${point.latitude}" lon="${point.longitude}"></wpt>');
    }
    buffer.writeln('</gpx>');
    return buffer.toString();
  }

  static const double pi = 3.1415926535897932;
  static double atan2(double y, double x) => math.atan2(y, x);
  static double sqrt(double x) => math.sqrt(x);
  static double sin(double x) => math.sin(x);
  static double cos(double x) => math.cos(x);

  static Future<bool> requestStoragePermission() async {
    if (Platform.isAndroid) {
      final PermissionStatus status = await Permission.storage.request();
      return status == PermissionStatus.granted;
    }
    return true; // iOS doesn't need explicit permission for app documents directory
  }
}

// Custom marker painter to create widget-based markers
class _CustomMarkerPainter extends CustomPainter {
  final Widget widget;
  final Size size;

  _CustomMarkerPainter(this.widget, this.size);

  @override
  void paint(Canvas canvas, Size size) {
    // Implementation would depend on Flutter version and requirements
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

Future<void> saveGPXToFile(String gpxData, String fileName) async {
  try {
    // Get the app's external storage directory (writable)
    final directory = await getExternalStorageDirectory();
    if (directory == null) {
      print('External storage directory not available');

      // Fallback to application documents directory
      final docDir = await getApplicationDocumentsDirectory();
      final gpxDirectory = Directory('${docDir.path}/gpx_files');

      // Ensure the directory exists
      if (!await gpxDirectory.exists()) {
        await gpxDirectory.create(recursive: true);
      }

      print('Saving GPX file to: ${gpxDirectory.path}');

      // Define the file path
      final file = File('${gpxDirectory.path}/$fileName.gpx');

      // Write the GPX data to the file
      await file.writeAsString(gpxData);

      print('GPX file saved at: ${file.path}');
      return;
    }

    // Create gpx_files directory in the external storage
    final gpxDirectory = Directory('${directory.path}/gpx_files');

    // Ensure the directory exists
    if (!await gpxDirectory.exists()) {
      await gpxDirectory.create(recursive: true);
    }

    print('Saving GPX file to: ${gpxDirectory.path}');

    // Define the file path
    final file = File('${gpxDirectory.path}/$fileName.gpx');

    // Write the GPX data to the file
    await file.writeAsString(gpxData);

    print('GPX file saved at: ${file.path}');
  } catch (e) {
    print('Error saving GPX file: $e');
  }
}

// Future<void> shareGPXFile(String filePath) async {
//   final File file = File(filePath);
//   if (await file.exists()) {
//     await Share.shareFiles([filePath], text: 'Sharing route GPX file');
//   } else {
//     print('File does not exist: $filePath');
//   }
// }

Future<void> exportRoute(List<LatLng> routePoints) async {
  // Request storage permission first
  bool hasPermission = await MapUtils.requestStoragePermission();

  if (hasPermission) {
    final gpxData = MapUtils.generateGPX(routePoints);
    await saveGPXToFile(gpxData, 'route_export');
  } else {
    print('Storage permission denied. Cannot export route.');
  }
}
