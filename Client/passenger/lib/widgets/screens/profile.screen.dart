import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:transit_lanka/core/models/user.dart';
import 'package:transit_lanka/shared/constants/colors.dart';
import '../../../core/providers/auth.provider.dart';
import '../../../core/models/passenger.dart';
import '../../../core/services/api/auth_service.dart';
import '../../../shared/widgets/custom_button.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class PassengerProfileScreen extends StatefulWidget {
  const PassengerProfileScreen({Key? key}) : super(key: key);

  @override
  State<PassengerProfileScreen> createState() => _PassengerProfileScreenState();
}

class _PassengerProfileScreenState extends State<PassengerProfileScreen> {
  bool _isLoading = true;
  Passenger? _passengerProfile;
  String? _error;
  final _authService = AuthService();
  final _secureStorage = const FlutterSecureStorage();

  @override
  void initState() {
    super.initState();
    _loadPassengerProfile();
  }

  Future<void> _loadPassengerProfile() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      // Debug: Print auth token and user info from provider
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final token = await _secureStorage.read(key: 'auth_token');
      print(
          'Token from storage: ${token != null ? "${token.substring(0, min(15, token.length))}..." : "missing"}');
      print(
          'User ID from provider: ${authProvider.currentUser?.id ?? "missing"}');
      print(
          'User role from provider: ${authProvider.currentUser?.role ?? "missing"}');

      if (token == null) {
        // Force relogin if token is missing
        _handleSessionExpired();
        return;
      }

      // Fetch profile using AuthService
      final passengerProfile = await _authService.getUserProfile('passenger');

      print('Passenger profile fetched successfully');

      setState(() {
        _passengerProfile = passengerProfile;
        _isLoading = false;
      });
    } catch (e) {
      print('Error fetching passenger profile: $e');

      // Check if the error is a 403 Forbidden error
      if (e.toString().contains('403') ||
          e.toString().contains('Forbidden') ||
          e.toString().contains('Unauthorized')) {
        print('Authorization error detected - forcing re-login');
        _handleSessionExpired();
      } else {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _handleSessionExpired() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    await authProvider.logout();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Your session has expired. Please log in again.')));

      // Navigate to login screen
      Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.currentUser;

    // Removed the Scaffold and AppBar since they're provided by the parent PassengerHomeScreen
    return _isLoading
        ? const Center(child: CircularProgressIndicator())
        : _error != null
            ? _buildErrorView()
            : _buildProfileView(user);
  }

  Widget _buildErrorView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 50, color: Colors.red),
          const SizedBox(height: 16),
          const Text(
            'Failed to load profile',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(_error ?? 'Unknown error'),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _loadPassengerProfile,
            child: const Text('Try Again'),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileView(User? user) {
    return RefreshIndicator(
      onRefresh: _loadPassengerProfile,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildProfileHeader(user),
            const SizedBox(height: 24),
            _buildPersonalInfo(),
            const SizedBox(height: 16),
            _buildAddressInfo(),
            const SizedBox(height: 16),
            _buildTravelStats(),
            const SizedBox(height: 24),
            _buildActionButtons(),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileHeader(User? user) {
    return Center(
      child: Column(
        children: [
          CircleAvatar(
            radius: 50,
            backgroundColor: AppColors.secondaryLight,
            backgroundImage: _passengerProfile?.image != null
                ? NetworkImage(_passengerProfile!.image!)
                : null,
            child: _passengerProfile?.image == null
                ? const Icon(Icons.person, size: 50, color: Colors.white)
                : null,
          ),
          const SizedBox(height: 16),
          Text(
            _passengerProfile?.name ?? user?.name ?? 'Passenger',
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Text(
              'Passenger',
              style: TextStyle(color: AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPersonalInfo() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Personal Information',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            _buildInfoRow(
                Icons.email, 'Email', _passengerProfile?.email ?? 'N/A'),
            _buildInfoRow(
                Icons.phone, 'Phone', _passengerProfile?.phone ?? 'N/A'),
          ],
        ),
      ),
    );
  }

  Widget _buildAddressInfo() {
    final addresses = _passengerProfile?.addresses ?? {};

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Addresses',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            if (addresses.containsKey('home'))
              _buildInfoRow(Icons.home, 'Home', addresses['home']!),
            if (addresses.containsKey('work'))
              _buildInfoRow(Icons.work, 'Work', addresses['work']!),
            if (addresses.isEmpty)
              _buildInfoRow(Icons.location_off, 'No addresses saved',
                  'Add an address to get started'),
          ],
        ),
      ),
    );
  }

  Widget _buildTravelStats() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Travel Information',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            _buildInfoRow(Icons.favorite, 'Favorite Routes',
                '${_passengerProfile?.favoriteRoutes.length ?? 0} saved routes'),
            _buildInfoRow(Icons.calendar_month, 'Member Since',
                _formatJoinDate(_passengerProfile?.id ?? '')),
          ],
        ),
      ),
    );
  }

  String _formatJoinDate(String userId) {
    // Extract timestamp from MongoDB ObjectId (first 4 bytes)
    if (userId.length >= 8) {
      try {
        final timestamp = int.parse(userId.substring(0, 8), radix: 16);
        final dateTime = DateTime.fromMillisecondsSinceEpoch(timestamp * 1000);
        return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
      } catch (e) {
        return 'N/A';
      }
    }
    return 'N/A';
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: AppColors.primary),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 16,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ElevatedButton.icon(
          icon: const Icon(Icons.edit),
          label: const Text('Edit Profile'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          onPressed: () {
            // Navigate to edit profile screen
            // This would be implemented in a separate ticket
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                content: Text('Edit profile feature coming soon!')));
          },
        ),
        const SizedBox(height: 12),
        ElevatedButton.icon(
          icon: const Icon(Icons.password),
          label: const Text('Change Password'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.white,
            foregroundColor: AppColors.primary,
            side: const BorderSide(color: AppColors.primary),
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          onPressed: () {
            // Navigate to change password screen
            // This would be implemented in a separate ticket
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                content: Text('Change password feature coming soon!')));
          },
        ),
        const SizedBox(height: 24),
        ElevatedButton.icon(
          icon: const Icon(Icons.logout),
          label: const Text('Logout'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.red.shade50,
            foregroundColor: Colors.red,
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          onPressed: () async {
            final confirmed = await showDialog<bool>(
              context: context,
              builder: (context) => AlertDialog(
                title: const Text('Confirm Logout'),
                content: const Text('Are you sure you want to logout?'),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context, false),
                    child: const Text('Cancel'),
                  ),
                  TextButton(
                    onPressed: () => Navigator.pop(context, true),
                    child: const Text('Logout'),
                  ),
                ],
              ),
            );

            if (confirmed == true && context.mounted) {
              await authProvider.logout();
              if (context.mounted) {
                Navigator.of(context).pushReplacementNamed('/login');
              }
            }
          },
        ),
      ],
    );
  }
}
