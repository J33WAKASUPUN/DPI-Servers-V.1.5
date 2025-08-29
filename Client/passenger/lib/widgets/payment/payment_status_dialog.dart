import 'package:flutter/material.dart';
import 'package:transit_lanka/shared/constants/colors.dart';

class PaymentStatusDialog extends StatefulWidget {
  final String title;
  final String message;
  final VoidCallback onCancel;
  final Future<bool> Function() onContinue;

  const PaymentStatusDialog({
    Key? key,
    required this.title,
    required this.message,
    required this.onCancel,
    required this.onContinue,
  }) : super(key: key);

  @override
  State<PaymentStatusDialog> createState() => _PaymentStatusDialogState();
}

class _PaymentStatusDialogState extends State<PaymentStatusDialog> {
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(widget.message),
          if (_isLoading) ...[
            const SizedBox(height: 20),
            const Center(child: CircularProgressIndicator()),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: _isLoading ? null : widget.onCancel,
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isLoading
              ? null
              : () async {
                  setState(() {
                    _isLoading = true;
                  });
                  await widget.onContinue();
                  if (mounted) {
                    setState(() {
                      _isLoading = false;
                    });
                  }
                },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
          ),
          child: const Text('Continue'),
        ),
      ],
    );
  }
}
