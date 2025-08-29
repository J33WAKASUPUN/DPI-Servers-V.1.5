import 'package:flutter/material.dart';
import 'package:transit_lanka/shared/constants/colors.dart';

class AdditionalPassengerForm extends StatefulWidget {
  final int count;
  final ValueChanged<List<Map<String, dynamic>>> onChanged;

  const AdditionalPassengerForm({
    Key? key,
    required this.count,
    required this.onChanged,
  }) : super(key: key);

  @override
  State<AdditionalPassengerForm> createState() =>
      _AdditionalPassengerFormState();
}

class _AdditionalPassengerFormState extends State<AdditionalPassengerForm> {
  List<Map<String, dynamic>> _passengers = [];

  @override
  void initState() {
    super.initState();
    _initPassengers();
  }

  @override
  void didUpdateWidget(AdditionalPassengerForm oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.count != oldWidget.count) {
      _initPassengers();
    }
  }

  void _initPassengers() {
    // Create or resize the passengers list based on the count
    if (_passengers.length > widget.count) {
      // Reduce the list if count decreased
      _passengers = _passengers.sublist(0, widget.count);
    } else {
      // Add more empty passenger info if count increased
      while (_passengers.length < widget.count) {
        _passengers.add({
          'name': '',
          'age': '',
          'gender': 'male',
        });
      }
    }

    // Use Future.microtask to avoid setState during build
    Future.microtask(() {
      widget.onChanged(_passengers);
    });
  }

  void _updatePassenger(int index, String key, dynamic value) {
    setState(() {
      _passengers[index][key] = value;
    });
    widget.onChanged(_passengers);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 16),
        const Text(
          'Additional Passenger Details',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: widget.count,
          itemBuilder: (context, index) {
            return Card(
              margin: const EdgeInsets.only(bottom: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Passenger ${index + 2}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      decoration: const InputDecoration(
                        labelText: 'Name',
                        border: OutlineInputBorder(),
                      ),
                      onChanged: (value) =>
                          _updatePassenger(index, 'name', value),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          flex: 2,
                          child: TextFormField(
                            decoration: const InputDecoration(
                              labelText: 'Age',
                              border: OutlineInputBorder(),
                            ),
                            keyboardType: TextInputType.number,
                            onChanged: (value) =>
                                _updatePassenger(index, 'age', value),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          flex: 3,
                          child: DropdownButtonFormField<String>(
                            decoration: const InputDecoration(
                              labelText: 'Gender',
                              border: OutlineInputBorder(),
                            ),
                            value: _passengers[index]['gender'],
                            items: const [
                              DropdownMenuItem(
                                  value: 'male', child: Text('Male')),
                              DropdownMenuItem(
                                  value: 'female', child: Text('Female')),
                              DropdownMenuItem(
                                  value: 'other', child: Text('Other')),
                            ],
                            onChanged: (value) =>
                                _updatePassenger(index, 'gender', value),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}
