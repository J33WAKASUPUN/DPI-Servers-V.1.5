import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:transit_lanka/core/providers/schedule.provider.dart';
import 'package:transit_lanka/screens/passenger/screens/passenger_home_screen.dart';
import 'package:transit_lanka/screens/passenger/widgets/common/tab.bar.dart';
import 'package:transit_lanka/shared/constants/colors.dart';
import 'package:transit_lanka/screens/passenger/widgets/schedules/schedule_card.dart';
import 'package:transit_lanka/screens/passenger/widgets/schedules/schedule_details.dart';

class PassengerScheduleScreen extends StatefulWidget {
  const PassengerScheduleScreen({Key? key}) : super(key: key);

  @override
  State<PassengerScheduleScreen> createState() =>
      _PassengerScheduleScreenState();
}

class _PassengerScheduleScreenState extends State<PassengerScheduleScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _isViewingDetails = false;
  int _selectedFilterIndex = 0;
  final List<String> _filterOptions = ['Today', 'Upcoming', 'All'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<ScheduleProvider>(context, listen: false)
          .fetchSchedules(filter: 'today');
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ScheduleProvider>(
      builder: (context, scheduleProvider, child) {
        if (scheduleProvider.selectedSchedule != null && _isViewingDetails) {
          return PassengerScheduleDetails(
            schedule: scheduleProvider.selectedSchedule!,
            onBack: () {
              setState(() {
                _isViewingDetails = false;
              });
              scheduleProvider.clearSelectedSchedule();
            },
          );
        }

        return Column(
          children: [
            // Search bar
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Search schedules...',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.clear),
                    onPressed: () {
                      _searchController.clear();
                      scheduleProvider.searchSchedules('');
                    },
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  contentPadding:
                      const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                ),
                onChanged: (value) => scheduleProvider.searchSchedules(value),
              ),
            ),

            // Filter options
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: SizedBox(
                height: 40,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _filterOptions.length,
                  itemBuilder: (context, index) {
                    final isSelected = _selectedFilterIndex == index;
                    return Padding(
                      padding: const EdgeInsets.only(right: 12),
                      child: FilterChip(
                        label: Text(_filterOptions[index]),
                        selected: isSelected,
                        onSelected: (selected) {
                          setState(() {
                            _selectedFilterIndex = index;
                          });
                          final filter = _filterOptions[index].toLowerCase();
                          scheduleProvider.fetchSchedules(
                              filter: filter == 'all' ? '' : filter);
                        },
                        backgroundColor: Colors.grey.shade200,
                        selectedColor: AppColors.primary.withOpacity(0.2),
                        checkmarkColor: AppColors.primary,
                        labelStyle: TextStyle(
                          color: isSelected ? AppColors.primary : Colors.black,
                          fontWeight:
                              isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),

            // Schedule list
            Expanded(
              child: scheduleProvider.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : scheduleProvider.filteredSchedules.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.schedule_outlined,
                                  size: 64, color: Colors.grey.shade400),
                              const SizedBox(height: 16),
                              Text(
                                _searchController.text.isNotEmpty
                                    ? 'No schedules found for "${_searchController.text}"'
                                    : 'No ${_filterOptions[_selectedFilterIndex].toLowerCase()} schedules available',
                                style: const TextStyle(fontSize: 16),
                              ),
                            ],
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: () async {
                            final filter = _filterOptions[_selectedFilterIndex]
                                .toLowerCase();
                            await scheduleProvider.fetchSchedules(
                                filter: filter == 'all' ? '' : filter);
                          },
                          child: ListView.builder(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 8),
                            itemCount:
                                scheduleProvider.filteredSchedules.length,
                            itemBuilder: (context, index) {
                              final schedule =
                                  scheduleProvider.filteredSchedules[index];
                              return PassengerScheduleCard(
                                schedule: schedule,
                                onTap: () {
                                  scheduleProvider.selectSchedule(schedule);
                                  _navigateToMapScreen(context);
                                },
                              );
                            },
                          ),
                        ),
            ),
          ],
        );
      },
    );
  }

  void _navigateToMapScreen(BuildContext context) {
    // Find the PassengerHomeScreen state using the correct class name
    final homeScreenState =
        context.findAncestorStateOfType<PassengerHomeScreenState>();

    if (homeScreenState != null) {
      // Call the public method
      homeScreenState.selectTab(PassengerTabItem.map);
    } else {
      // Fallback - show instructions
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Please go to the Map tab to see the route')),
      );
    }
  }
}
