import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:transit_lanka/config/api.endpoints.dart';
import 'package:transit_lanka/core/models/journey.dart';
import 'package:transit_lanka/core/services/journey.service.dart';
import 'package:transit_lanka/shared/constants/colors.dart';
import 'package:intl/intl.dart';
import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TicketScreen extends StatefulWidget {
  final String journeyId;

  const TicketScreen({
    Key? key,
    required this.journeyId,
  }) : super(key: key);

  @override
  State<TicketScreen> createState() => _TicketScreenState();
}

class _TicketScreenState extends State<TicketScreen> {
  final JourneyService _journeyService = JourneyService();
  final _secureStorage = const FlutterSecureStorage();
  bool _isLoading = true;
  String? _error;
  Journey? _journey;

  @override
  void initState() {
    super.initState();
    _loadJourneyDetails();
  }

  Future<void> _loadJourneyDetails() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final journeyResult =
          await _journeyService.getJourneyDetails(widget.journeyId);

      if (!journeyResult['status']) {
        throw Exception(
            journeyResult['message'] ?? 'Failed to load journey details');
      }

      setState(() {
        _journey = Journey.fromJson(journeyResult['data']);
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _regenerateQRCode(BuildContext context, String journeyId) async {
    try {
      setState(() {
        _isLoading = true;
      });

      final response = await http.post(
        Uri.parse(
            '${ApiEndpoints.baseUrl}/api/journeys/$journeyId/regenerate-qr'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization':
              'Bearer ${await _secureStorage.read(key: 'auth_token')}',
        },
      );

      final responseData = jsonDecode(response.body);

      if (responseData['status'] == true) {
        // Refresh the journey data to get the new QR code
        await _loadJourneyDetails();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('QR code generated successfully')),
        );
      } else {
        throw Exception(
            responseData['message'] ?? 'Failed to generate QR code');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${e.toString()}')),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Your Ticket'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        systemOverlayStyle: SystemUiOverlayStyle.light,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorView()
              : _buildTicketView(),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          Text(
            _error ?? 'An unknown error occurred',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _loadJourneyDetails,
            child: const Text('Try Again'),
          ),
        ],
      ),
    );
  }

  Widget _buildTicketView() {
    if (_journey == null) {
      return const Center(child: Text('No ticket information available'));
    }

    final isPaid = _journey!.paymentStatus == 'paid';
    final startDate = DateFormat('MMM d, yyyy').format(_journey!.startTime);
    final startTime = DateFormat('h:mm a').format(_journey!.startTime);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Payment status banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
            decoration: BoxDecoration(
              color: isPaid ? Colors.green : Colors.orange,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              isPaid ? 'Payment Confirmed' : 'Payment Pending - Pay in Bus',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
          ),

          const SizedBox(height: 24),

          // Ticket Details Card
          Card(
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(
                  color: AppColors.primary.withOpacity(0.5), width: 1),
            ),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  // Route name
                  Text(
                    _journey!.routeDetails.routeName,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                    textAlign: TextAlign.center,
                  ),

                  const SizedBox(height: 16),

                  // QR Code
                  Container(
                    width: 200,
                    height: 200,
                    child: _buildQRCodeWithRefresh(
                        context, widget.journeyId, _journey!.qrCode),
                  ),

                  const SizedBox(height: 16),

                  // Ticket number
                  Text(
                    _journey!.ticketNumber != null
                        ? 'Ticket #: ${_journey!.ticketNumber}'
                        : 'Booking Ref: ${_journey!.id.substring(0, 8)}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Journey details
                  _buildInfoRow('Date', startDate),
                  _buildInfoRow('Time', startTime),
                  _buildInfoRow('From',
                      _journey!.routeDetails.startLocation?.name ?? 'N/A'),
                  _buildInfoRow(
                      'To', _journey!.routeDetails.endLocation?.name ?? 'N/A'),
                  _buildInfoRow(
                      'Status', _capitalizeFirstLetter(_journey!.status)),
                  if (_journey!.additionalPassengerInfo != null)
                    _buildInfoRow('Passengers',
                        '${1 + (_journey!.additionalPassengerInfo != null ? 1 : 0)}'),

                  const Divider(height: 32),

                  // Payment details
                  _buildInfoRow('Payment Method',
                      _capitalizeFirstLetter(_journey!.paymentMethod)),
                  _buildInfoRow('Payment Status',
                      _capitalizeFirstLetter(_journey!.paymentStatus)),
                  _buildInfoRow(
                      'Fare', '\$${_journey!.fare.toStringAsFixed(2)}'),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Instructions
          Card(
            elevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: const [
                      Icon(Icons.info_outline, color: AppColors.primary),
                      SizedBox(width: 8),
                      Text(
                        'Instructions',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  isPaid
                      ? const Text(
                          'Show this QR code to the driver or conductor when boarding the bus. They will scan it to verify your ticket.',
                          style: TextStyle(fontSize: 14),
                        )
                      : const Text(
                          'Pay the fare to the conductor when boarding the bus and show this booking reference. They will scan it to complete your payment.',
                          style: TextStyle(fontSize: 14),
                        ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Share button
          OutlinedButton.icon(
            onPressed: () {
              // TODO: Implement share functionality
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                    content: Text('Share functionality coming soon!')),
              );
            },
            icon: const Icon(Icons.share),
            label: const Text('Share Ticket'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 24),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQRCode(String qrCodeData) {
    // Check if it's a base64 string
    if (qrCodeData.startsWith('data:image/png;base64,')) {
      try {
        // Extract the base64 part
        final base64String = qrCodeData.split(',')[1];
        // Convert base64 to bytes
        final Uint8List bytes = base64Decode(base64String);

        return Image.memory(
          bytes,
          width: 200,
          height: 200,
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) {
            print('Error loading QR code: $error');
            return Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.red),
              ),
              child: Center(
                child: Text(
                  'QR Code Error',
                  style: TextStyle(color: Colors.red),
                ),
              ),
            );
          },
        );
      } catch (e) {
        print('Error decoding QR code: $e');
        return _buildPlaceholderQR();
      }
    } else {
      // If it's a regular URL, use NetworkImage
      return Image.network(
        qrCodeData,
        width: 200,
        height: 200,
        fit: BoxFit.contain,
        errorBuilder: (context, error, stackTrace) {
          print('Error loading QR code from URL: $error');
          return _buildPlaceholderQR();
        },
      );
    }
  }

  Widget _buildQRCodeWithRefresh(
      BuildContext context, String journeyId, String? qrCodeData) {
    return Column(
      children: [
        _buildQRCode(qrCodeData ?? ''),
        if (qrCodeData == null || qrCodeData.isEmpty)
          TextButton.icon(
            icon: Icon(Icons.refresh),
            label: Text('Generate QR Code'),
            onPressed: () => _regenerateQRCode(context, journeyId),
          ),
      ],
    );
  }

  Widget _buildPlaceholderQR() {
    return Container(
      width: 200,
      height: 200,
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.qr_code, size: 64, color: Colors.grey),
            SizedBox(height: 8),
            Text('QR code will be shown here'),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade700,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  String _capitalizeFirstLetter(String input) {
    if (input.isEmpty) return input;
    return input[0].toUpperCase() + input.substring(1);
  }
}
