import 'package:flutter/material.dart';
import 'package:transit_lanka/screens/passenger/screens/notifications.screen.dart';
import 'package:transit_lanka/screens/passenger/screens/tickets_list.screen.dart';
import 'package:transit_lanka/shared/constants/colors.dart';

class PassengerAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final VoidCallback? onMenuPressed;

  const PassengerAppBar({
    Key? key,
    required this.title,
    this.onMenuPressed,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.primary,
      elevation: 0,
      title: Text(
        title,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
        ),
      ),
      centerTitle: true,
      leading: IconButton(
        icon: const Icon(Icons.menu, color: Colors.white),
        onPressed: onMenuPressed ??
            () {
              Scaffold.of(context).openDrawer();
            },
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.notifications, color: Colors.white),
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => NotificationsScreen(),
              ),
            );
          },
        ),
        IconButton(
          icon: const Icon(Icons.confirmation_number, color: Colors.white),
          onPressed: () {
            // Navigate to tickets screen instead of showing snackbar
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => TicketsListScreen(),
              ),
            );
          },
        ),
      ],
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}
