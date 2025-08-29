import 'package:flutter/material.dart';
import 'package:transit_lanka/core/models/schedule.dart';
import 'package:transit_lanka/shared/constants/colors.dart';

class PassengerScheduleCard extends StatelessWidget {
  final Schedule schedule;
  final VoidCallback onTap;

  const PassengerScheduleCard({
    Key? key,
    required this.schedule,
    required this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.symmetric(vertical: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      schedule.routeName,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  _buildStatusChip(),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildInfoItem(
                    Icons.access_time,
                    'Time',
                    '${schedule.formattedStartTime} - ${schedule.formattedEndTime}',
                  ),
                  _buildInfoItem(
                    Icons.calendar_today,
                    'Days',
                    _formatDays(schedule.dayOfWeek),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Driver info or other details could go here
                  const Spacer(),
                  ElevatedButton(
                    onPressed: schedule.status != 'completed'
                        ? onTap // Use the same onTap handler for the button
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: Colors.grey,
                    ),
                    child: const Text('View on Map'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
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

  Widget _buildInfoItem(IconData icon, String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Colors.grey,
          ),
        ),
        const SizedBox(height: 4),
        Row(
          children: [
            Icon(
              icon,
              size: 16,
              color: AppColors.primary,
            ),
            const SizedBox(width: 4),
            Text(
              value,
              style: const TextStyle(fontSize: 14),
            ),
          ],
        ),
      ],
    );
  }

  String _formatDays(List<String> days) {
    if (days.isEmpty) return 'N/A';
    if (days.length > 2) {
      return '${days.length} days';
    }
    return days.join(', ');
  }
}
