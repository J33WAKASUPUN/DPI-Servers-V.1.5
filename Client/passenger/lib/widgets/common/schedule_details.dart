import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:transit_lanka/core/models/schedule.dart';
import 'package:transit_lanka/screens/passenger/screens/payment.screen.dart';
import 'package:transit_lanka/shared/constants/colors.dart';
import 'package:transit_lanka/shared/widgets/custom_button.dart';

class PassengerScheduleDetails extends StatelessWidget {
  final Schedule schedule;
  final VoidCallback onBack;

  const PassengerScheduleDetails({
    Key? key,
    required this.schedule,
    required this.onBack,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header with back button
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: onBack,
              ),
              IconButton(
                icon: const Icon(Icons.share, color: AppColors.primary),
                onPressed: () {
                  // TODO: Implement share functionality
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                        content: Text('Share functionality coming soon!')),
                  );
                },
                tooltip: 'Share schedule',
              ),
            ],
          ),
        ),

        // Route name and status
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                schedule.routeName,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              _buildStatusChip(),
            ],
          ),
        ),

        // Schedule statistics
        Padding(
          padding: const EdgeInsets.all(20.0),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.withOpacity(0.1),
                  spreadRadius: 1,
                  blurRadius: 5,
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildStatItem(
                      icon: Icons.access_time,
                      label: 'Time',
                      value:
                          '${schedule.formattedStartTime} - ${schedule.formattedEndTime}',
                    ),
                    _buildStatItem(
                      icon: Icons.calendar_today,
                      label: 'Days',
                      value: _formatDays(schedule.dayOfWeek),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 16),
                // Fare information
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.payment, color: AppColors.primary),
                    const SizedBox(width: 8),
                    const Text(
                      'Fare: ',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'Rs. ${(schedule.estimatedFare ?? 100).toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Payment button
                if (schedule.status != 'completed')
                  CustomButton(
                    text: 'Buy Ticket',
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => PaymentScreen(
                            schedule: schedule,
                          ),
                        ),
                      );
                    },
                    backgroundColor: AppColors.primary,
                    textColor: Colors.white,
                    width: double.infinity,
                  ),
              ],
            ),
          ),
        ),

        // Stops list
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0),
          child: Text(
            'Stops Schedule',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),

        Expanded(
          child: schedule.stopTimes.isEmpty
              ? const Center(
                  child: Text('No stop times available for this schedule'),
                )
              : ListView.builder(
                  itemCount: schedule.stopTimes.length,
                  padding: const EdgeInsets.all(20),
                  itemBuilder: (context, index) {
                    final stopTime = schedule.stopTimes[index];
                    final isCurrentStop = _isCurrentStop(stopTime);
                    final isPastStop = _isPastStop(stopTime);

                    return Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isCurrentStop
                            ? AppColors.primaryLight.withOpacity(0.2)
                            : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.grey.withOpacity(0.1),
                            spreadRadius: 1,
                            blurRadius: 5,
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 30,
                            height: 30,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: isPastStop
                                  ? Colors.grey
                                  : isCurrentStop
                                      ? AppColors.primary
                                      : AppColors.secondaryLight,
                              shape: BoxShape.circle,
                            ),
                            child: isPastStop
                                ? const Icon(Icons.check,
                                    color: Colors.white, size: 16)
                                : Text(
                                    '${index + 1}',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  stopTime.stopName,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Arrival: ${DateFormat('hh:mm a').format(stopTime.arrivalTime)}',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: isCurrentStop
                                        ? AppColors.primary
                                        : Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (isCurrentStop)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Text(
                                'Current',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildStatusChip() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: schedule.getStatusColor().withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: schedule.getStatusColor()),
      ),
      child: Text(
        schedule.getStatusText(),
        style: TextStyle(
          color: schedule.getStatusColor(),
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildStatItem({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Column(
      children: [
        Icon(icon, color: AppColors.primary),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(
            color: Colors.grey,
            fontSize: 12,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
      ],
    );
  }

  String _formatDays(List<String> days) {
    if (days.isEmpty) return 'N/A';
    if (days.length > 3) {
      return '${days.length} days';
    }
    return days.join(', ');
  }

  bool _isCurrentStop(StopTime stopTime) {
    // Determine if this is the current stop based on the current time
    if (schedule.status != 'in-progress') return false;

    final now = DateTime.now();
    final isToday = now.day == stopTime.arrivalTime.day &&
        now.month == stopTime.arrivalTime.month &&
        now.year == stopTime.arrivalTime.year;

    if (!isToday) return false;

    // Check if current time is within 15 minutes of the stop time
    final diff = now.difference(stopTime.arrivalTime).inMinutes;
    return diff >= -15 && diff <= 15;
  }

  bool _isPastStop(StopTime stopTime) {
    // Determine if this stop has already been passed
    if (schedule.status == 'completed') return true;
    if (schedule.status == 'scheduled') return false;

    final now = DateTime.now();
    return now.isAfter(stopTime.arrivalTime.add(const Duration(minutes: 15)));
  }
}
