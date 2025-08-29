import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:transit_lanka/config/api.endpoints.dart';
import 'package:transit_lanka/core/models/schedule.dart';
import 'package:transit_lanka/core/providers/auth.provider.dart';
import 'package:transit_lanka/core/providers/notification.provider.dart';
import 'package:transit_lanka/core/services/payment.service.dart';
import 'package:transit_lanka/core/services/journey.service.dart';
import 'package:transit_lanka/screens/passenger/widgets/payment/paypal_webview.dart';
import 'package:transit_lanka/shared/constants/colors.dart';
import 'package:transit_lanka/shared/widgets/custom_button.dart';
import 'package:transit_lanka/screens/passenger/widgets/payment/payment_method_card.dart';
import 'package:transit_lanka/screens/passenger/widgets/payment/passenger_counter.dart';
import 'package:transit_lanka/screens/passenger/widgets/payment/additional_passenger_form.dart';
import 'package:transit_lanka/screens/passenger/widgets/payment/payment_status_dialog.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:transit_lanka/screens/passenger/screens/ticket.screen.dart';
import 'package:intl/intl.dart';
import 'dart:math' as math;
// import 'package:url_launcher/url_launcher.dart';
import 'package:flutter/services.dart'; // Add this import at the top

class PaymentScreen extends StatefulWidget {
  final Schedule schedule;

  const PaymentScreen({
    Key? key,
    required this.schedule,
  }) : super(key: key);

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  final PaymentService _paymentService = PaymentService();
  final JourneyService _journeyService = JourneyService();
  final _secureStorage = FlutterSecureStorage();
  String _selectedPaymentMethod = 'online';
  bool _isLoading = false;
  bool _isPreparing = true;
  String? _error;
  double _fare = 0.0;
  int _passengerCount = 1;
  List<Map<String, dynamic>> _additionalPassengers = [];
  String? _journeyId;

  @override
  void initState() {
    super.initState();
    _loadFareInformation();
  }

  Future<void> _loadFareInformation() async {
    try {
      setState(() {
        _isPreparing = true;
        _error = null;
      });

      final fare = await _paymentService.getScheduleFare(widget.schedule.id);

      // Ensure fare is never zero - set a minimum fare value
      final effectiveFare = fare > 0 ? fare : 30.0; // $30 minimum fare

      setState(() {
        _fare = effectiveFare;
        _isPreparing = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load fare information: $e';
        _isPreparing = false;
        _fare = 5.0; // Default fare if loading fails
      });
    }
  }

  Future<void> _processPayment() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      if (!authProvider.isAuthenticated) {
        throw Exception('You must be logged in to make a payment');
      }

      // For online payments, create journey first then payment
      if (_selectedPaymentMethod == 'online') {
        // Book the journey
        final journeyResult = await _journeyService.bookJourney(
          widget.schedule.id,
          _selectedPaymentMethod,
          _additionalPassengers,
        );

        if (!journeyResult['status']) {
          throw Exception(journeyResult['message'] ?? 'Failed to book journey');
        }

        _journeyId = journeyResult['data']['_id'];

        // Create payment order with a guaranteed non-zero amount
        final totalAmount = _fare * _passengerCount;
        final effectiveAmount = totalAmount > 0 ? totalAmount : 30.0;

        final paymentResult = await _paymentService.createPaymentOrder(
          _journeyId!,
          effectiveAmount,
        );

        if (!paymentResult['status']) {
          throw Exception(
              paymentResult['message'] ?? 'Failed to create payment');
        }

        // Extract PayPal data
        final String orderId = paymentResult['data']['orderId'];
        final String paymentId = paymentResult['data']['paymentId'];
        final String approvalUrl = paymentResult['data']['approvalUrl'];

        // Launch the payment URL directly - no intermediate dialog
        await _launchPayPalUrl(orderId, paymentId, approvalUrl);
      } else {
        // In-bus payment (unchanged)
        final journeyResult = await _journeyService.bookJourney(
          widget.schedule.id,
          'in-bus',
          _additionalPassengers,
        );

        if (!journeyResult['status']) {
          throw Exception(journeyResult['message'] ?? 'Failed to book journey');
        }

        _journeyId = journeyResult['data']['_id'];
        _navigateToTicketScreen();
      }

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = e.toString();
      });
      _showErrorDialog(e.toString());
    }
  }

  Future<bool> _launchPayPalUrl(
      String orderId, String paymentId, String approvalUrl) async {
    try {
      // Debug message
      print("Opening PayPal URL: $approvalUrl");

      if (approvalUrl.isEmpty || !approvalUrl.startsWith('http')) {
        throw Exception('Invalid PayPal approval URL');
      }

      // Show a dialog with the URL for the user to copy manually
      final userAction = await showDialog<String>(
        context: context,
        barrierDismissible: false,
        builder: (BuildContext context) {
          return AlertDialog(
            title: Text('PayPal Payment'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                      'Please open this URL in your browser to complete payment:'),
                  SizedBox(height: 12),
                  Container(
                    padding: EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: SelectableText(
                      approvalUrl,
                      style: TextStyle(fontFamily: 'monospace'),
                    ),
                  ),
                  SizedBox(height: 12),
                  ElevatedButton.icon(
                    icon: Icon(Icons.copy),
                    label: Text('Copy URL'),
                    onPressed: () => _copyToClipboard(approvalUrl),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey.shade200,
                      foregroundColor: Colors.black,
                    ),
                  ),
                  SizedBox(height: 12),
                  Text(
                      'After completing payment, press "Payment Complete" to continue.'),
                ],
              ),
            ),
            actions: <Widget>[
              TextButton(
                onPressed: () => Navigator.pop(context, 'cancel'),
                child: Text('Cancel Payment'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, 'complete'),
                child: Text('Payment Complete'),
              ),
            ],
          );
        },
      );

      if (userAction == 'complete') {
        // Try to capture the payment
        final captureResult = await _paymentService.capturePayment(orderId);

        if (captureResult['status']) {
          // Add notification for successful payment
          final notificationProvider =
              Provider.of<NotificationProvider>(context, listen: false);
          notificationProvider.addPaymentSuccessNotification(
            _journeyId!,
            widget.schedule.routeName,
            _fare * _passengerCount,
          );

          // Navigate to ticket screen on success
          _navigateToTicketScreen();
          return true;
        }

        if (!captureResult['status']) {
          throw Exception(
              captureResult['message'] ?? 'Failed to capture payment');
        }

        // Add notification for successful payment
        final notificationProvider =
            Provider.of<NotificationProvider>(context, listen: false);
        notificationProvider.addPaymentSuccessNotification(
          _journeyId!,
          widget.schedule.routeName,
          _fare * _passengerCount,
        );

        // Navigate to ticket screen on success
        _navigateToTicketScreen();
        return true;
      }

      return false;
    } catch (e) {
      print("PayPal launch error: $e");
      _showErrorDialog('Payment failed: ${e.toString()}');
      return false;
    }
  }

  void _navigateToTicketScreen() {
    if (_journeyId == null) return;

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (context) => TicketScreen(journeyId: _journeyId!),
      ),
    );
  }

  void _handleAdditionalPassengerChanged(
      List<Map<String, dynamic>> passengers) {
    // Use Future.microtask to avoid setState during build
    Future.microtask(() {
      setState(() {
        _additionalPassengers = passengers;
      });
    });
  }

  void _copyToClipboard(String text) {
    Clipboard.setData(ClipboardData(text: text)).then((_) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('PayPal URL copied to clipboard')),
      );
    });
  }

  void _showErrorDialog(String error) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Payment Error'),
        content: Text(error),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalFare = _fare * _passengerCount;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _isPreparing
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorView()
              : _buildPaymentForm(totalFare),
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
            onPressed: _loadFareInformation,
            child: const Text('Try Again'),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentForm(double totalFare) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Schedule Info Card
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
                  Text(
                    widget.schedule.routeName,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today, size: 16),
                      const SizedBox(width: 8),
                      Text(
                        DateFormat('EEEE, MMMM d')
                            .format(widget.schedule.startTime),
                        style: const TextStyle(
                          fontSize: 14,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.access_time, size: 16),
                      const SizedBox(width: 8),
                      Text(
                        '${widget.schedule.formattedStartTime} - ${widget.schedule.formattedEndTime}',
                        style: const TextStyle(
                          fontSize: 14,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),
          const Text(
            'Passengers',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),

          // Passenger Counter
          PassengerCounter(
            count: _passengerCount,
            onChanged: (value) {
              setState(() {
                _passengerCount = value;
                // Reset additional passengers if count is reduced
                if (_additionalPassengers.length > value - 1) {
                  _additionalPassengers =
                      _additionalPassengers.sublist(0, value - 1);
                }
              });
            },
          ),

          // Additional Passenger Form
          if (_passengerCount > 1)
            AdditionalPassengerForm(
              count: _passengerCount - 1,
              onChanged: _handleAdditionalPassengerChanged,
            ),

          const SizedBox(height: 24),
          const Text(
            'Payment Method',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),

          // Payment Method Selection
          Row(
            children: [
              Expanded(
                child: PaymentMethodCard(
                  title: 'Online Payment',
                  icon: Icons.payment,
                  description: 'Pay now with PayPal or Card',
                  isSelected: _selectedPaymentMethod == 'online',
                  onTap: () {
                    setState(() {
                      _selectedPaymentMethod = 'online';
                    });
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: PaymentMethodCard(
                  title: 'Pay in Bus',
                  icon: Icons.directions_bus,
                  description: 'Pay cash to the conductor',
                  isSelected: _selectedPaymentMethod == 'in-bus',
                  onTap: () {
                    setState(() {
                      _selectedPaymentMethod = 'in-bus';
                    });
                  },
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Fare Summary
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
                  const Text(
                    'Fare Summary',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Fare per person'),
                      Text('\$${_fare.toStringAsFixed(2)}'),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Number of passengers'),
                      Text('$_passengerCount'),
                    ],
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '\$${totalFare.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Payment Button
          CustomButton(
            text: _selectedPaymentMethod == 'online'
                ? 'Proceed to Payment'
                : 'Reserve Ticket',
            isLoading: _isLoading,
            onPressed: _isLoading ? () {} : () => _processPayment(),
            backgroundColor: AppColors.primary,
            textColor: Colors.white,
            width: double.infinity,
          ),
        ],
      ),
    );
  }
}
