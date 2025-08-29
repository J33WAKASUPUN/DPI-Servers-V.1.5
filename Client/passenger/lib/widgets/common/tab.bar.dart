import 'package:flutter/material.dart';
import 'package:transit_lanka/shared/constants/colors.dart';

enum PassengerTabItem {
  routes,
  map,
  profile,
}

class PassengerTabBar extends StatelessWidget {
  final PassengerTabItem currentTab;
  final Function(PassengerTabItem) onTabSelected;

  const PassengerTabBar({
    Key? key,
    required this.currentTab,
    required this.onTabSelected,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 65,
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.2),
            spreadRadius: 1,
            blurRadius: 5,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildTabItem(
            context: context,
            item: PassengerTabItem.routes,
            icon: Icons.route,
            title: 'Routes',
          ),
          _buildTabItem(
            context: context,
            item: PassengerTabItem.map,
            icon: Icons.map,
            title: 'Map',
          ),
          _buildTabItem(
            context: context,
            item: PassengerTabItem.profile,
            icon: Icons.person,
            title: 'Profile',
          ),
        ],
      ),
    );
  }

  Widget _buildTabItem({
    required BuildContext context,
    required PassengerTabItem item,
    required IconData icon,
    required String title,
  }) {
    final isSelected = currentTab == item;
    final color = isSelected ? AppColors.primary : Colors.grey;

    return GestureDetector(
      onTap: () => onTabSelected(item),
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(
              color: isSelected ? AppColors.primary : Colors.transparent,
              width: 3,
            ),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 2),
            Text(
              title,
              style: TextStyle(
                color: color,
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
