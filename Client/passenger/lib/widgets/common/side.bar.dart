import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:transit_lanka/core/providers/auth.provider.dart';
import 'package:transit_lanka/shared/constants/colors.dart';

enum PassengerSideBarItem { routes, map, profile, settings, logout }

class PassengerSideBar extends StatelessWidget {
  final PassengerSideBarItem currentItem;
  final Function(PassengerSideBarItem) onItemSelected;

  const PassengerSideBar({
    Key? key,
    required this.currentItem,
    required this.onItemSelected,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.currentUser;

    return Drawer(
      child: Container(
        color: Colors.white,
        child: Column(
          children: [
            UserAccountsDrawerHeader(
              decoration: BoxDecoration(
                color: AppColors.primary,
              ),
              accountName: Text(
                user?.name ?? "Passenger",
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              accountEmail: Text(
                user?.email ?? "passenger@example.com",
              ),
              currentAccountPicture: CircleAvatar(
                backgroundColor: AppColors.secondaryLight,
                backgroundImage: user?.profileImageUrl != null
                    ? NetworkImage(user!.profileImageUrl!)
                    : null,
                child: user?.profileImageUrl == null
                    ? const Icon(Icons.person, size: 40, color: Colors.white)
                    : null,
              ),
            ),
            _buildDrawerItem(
              icon: Icons.route,
              title: 'Routes',
              isSelected: currentItem == PassengerSideBarItem.routes,
              onTap: () {
                onItemSelected(PassengerSideBarItem.routes);
                Navigator.pop(context); // Close drawer
              },
            ),
            _buildDrawerItem(
              icon: Icons.map,
              title: 'Map',
              isSelected: currentItem == PassengerSideBarItem.map,
              onTap: () {
                onItemSelected(PassengerSideBarItem.map);
                Navigator.pop(context); // Close drawer
              },
            ),
            _buildDrawerItem(
              icon: Icons.person,
              title: 'Profile',
              isSelected: currentItem == PassengerSideBarItem.profile,
              onTap: () {
                onItemSelected(PassengerSideBarItem.profile);
                Navigator.pop(context); // Close drawer
              },
            ),
            _buildDrawerItem(
              icon: Icons.settings,
              title: 'Settings',
              isSelected: currentItem == PassengerSideBarItem.settings,
              onTap: () {
                onItemSelected(PassengerSideBarItem.settings);
                Navigator.pop(context); // Close drawer
              },
            ),
            const Divider(),
            _buildDrawerItem(
              icon: Icons.exit_to_app,
              title: 'Logout',
              isSelected: currentItem == PassengerSideBarItem.logout,
              onTap: () async {
                await authProvider.logout();
                if (context.mounted) {
                  Navigator.of(context).pushReplacementNamed('/login');
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerItem({
    required IconData icon,
    required String title,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(
        icon,
        color: isSelected ? AppColors.primary : Colors.grey,
      ),
      title: Text(
        title,
        style: TextStyle(
          color: isSelected ? AppColors.primary : Colors.black87,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      tileColor: isSelected ? AppColors.primaryLight.withOpacity(0.1) : null,
      onTap: onTap,
    );
  }
}
