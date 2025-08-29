import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/schedule_provider.dart';
import '../../providers/journey_provider.dart';
import '../../providers/location_provider.dart';
import '../../models/schedule.dart';
import 'journey_screen.dart';
import 'home_screen.dart';

class ScheduleSelectionScreen extends StatefulWidget {
  const ScheduleSelectionScreen({Key? key}) : super(key: key);

  @override
  State<ScheduleSelectionScreen> createState() =>
      _ScheduleSelectionScreenState();
}

class _ScheduleSelectionScreenState extends State<ScheduleSelectionScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<ScheduleProvider>(context, listen: false)
          .fetchActiveSchedules();
    });
  }

  Future<void> _startJourney(Schedule schedule) async {
    final journeyProvider =
        Provider.of<JourneyProvider>(context, listen: false);
    final scheduleProvider =
        Provider.of<ScheduleProvider>(context, listen: false);

    final success = await journeyProvider.startJourney(schedule.id);

    if (success && mounted) {
      scheduleProvider.selectSchedule(schedule);
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const JourneyScreen()),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(journeyProvider.error ?? 'Failed to start journey'),
          backgroundColor: AppTheme.errorRed,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Schedule'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            Navigator.pushAndRemoveUntil(
              context,
              MaterialPageRoute(builder: (context) => const HomeScreen()),
              (route) => false,
            );
          },
        ),
      ),
      body: Consumer<ScheduleProvider>(
        builder: (context, scheduleProvider, child) {
          if (scheduleProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (scheduleProvider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 64,
                    color: AppTheme.errorRed,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    scheduleProvider.error!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 16),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () {
                      scheduleProvider.fetchActiveSchedules();
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (scheduleProvider.schedules.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.schedule,
                    size: 64,
                    color: Colors.grey,
                  ),
                  SizedBox(height: 16),
                  Text(
                    'No active schedules available',
                    style: TextStyle(fontSize: 18),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Check back later for new schedules',
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => scheduleProvider.fetchActiveSchedules(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: scheduleProvider.schedules.length,
              itemBuilder: (context, index) {
                final schedule = scheduleProvider.schedules[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    title: Text(
                      schedule.routeName,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                            '${schedule.startLocation} → ${schedule.endLocation}'),
                        const SizedBox(height: 4),
                        Text(
                          'Scheduled: ${_formatTime(schedule.scheduledTime)}',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                        if (schedule.busNumber != null)
                          Text('Bus: ${schedule.busNumber}'),
                      ],
                    ),
                    trailing: ElevatedButton(
                      onPressed: () => _startJourney(schedule),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.successGreen,
                      ),
                      child: const Text('Start'),
                    ),
                    isThreeLine: true,
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}
