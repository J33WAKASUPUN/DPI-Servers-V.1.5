import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:transit_lanka/core/providers/notification.provider.dart';
import 'package:transit_lanka/core/models/notification.dart';
import 'package:transit_lanka/screens/passenger/screens/ticket.screen.dart';
import 'package:transit_lanka/shared/constants/colors.dart';
import 'package:timeago/timeago.dart' as timeago;

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({Key? key}) : super(key: key);

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() {
      _isLoading = true;
    });

    try {
      // Load notifications from provider
      final notificationProvider =
          Provider.of<NotificationProvider>(context, listen: false);
      await notificationProvider.loadNotifications();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading notifications: ${e.toString()}')),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.check_circle),
            tooltip: 'Mark all as read',
            onPressed: () {
              final notificationProvider =
                  Provider.of<NotificationProvider>(context, listen: false);
              notificationProvider.markAllAsRead();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                    content: Text('All notifications marked as read')),
              );
            },
          ),
        ],
      ),
      body: Consumer<NotificationProvider>(
        builder: (context, notificationProvider, child) {
          if (_isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          final notifications = notificationProvider.notifications;

          if (notifications.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_off,
                      size: 64, color: Colors.grey.shade300),
                  const SizedBox(height: 16),
                  Text(
                    'No notifications',
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    icon: const Icon(Icons.refresh),
                    label: const Text('Refresh'),
                    onPressed: _loadNotifications,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: _loadNotifications,
            child: ListView.builder(
              padding: const EdgeInsets.all(8),
              itemCount: notifications.length,
              itemBuilder: (context, index) {
                final notification = notifications[index];
                return _buildNotificationCard(notification);
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildNotificationCard(NotificationModel notification) {
    // Different colors based on notification type
    Color backgroundColor = Colors.white;
    Color iconColor = Colors.black;
    IconData iconData = Icons.notifications;

    // Configure style based on type
    switch (notification.type) {
      case 'payment_success':
        iconData = Icons.payment;
        iconColor = Colors.green;
        backgroundColor =
            notification.isRead ? Colors.white : Colors.green.withOpacity(0.1);
        break;
      case 'payment_failed':
        iconData = Icons.error;
        iconColor = Colors.red;
        backgroundColor =
            notification.isRead ? Colors.white : Colors.red.withOpacity(0.1);
        break;
      case 'ticket_issued':
        iconData = Icons.confirmation_number;
        iconColor = AppColors.primary;
        backgroundColor = notification.isRead
            ? Colors.white
            : AppColors.primaryLight.withOpacity(0.1);
        break;
      default:
        iconData = Icons.notifications;
        iconColor = Colors.blue;
        backgroundColor =
            notification.isRead ? Colors.white : Colors.blue.withOpacity(0.1);
    }

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
      color: backgroundColor,
      elevation: notification.isRead ? 1 : 2,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: iconColor.withOpacity(0.1),
          child: Icon(iconData, color: iconColor),
        ),
        title: Text(
          notification.title,
          style: TextStyle(
            fontWeight:
                notification.isRead ? FontWeight.normal : FontWeight.bold,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(notification.message),
            const SizedBox(height: 4),
            Text(
              timeago.format(notification.timestamp),
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
        isThreeLine: true,
        onTap: () {
          // Mark as read when clicked
          final notificationProvider =
              Provider.of<NotificationProvider>(context, listen: false);
          notificationProvider.markAsRead(notification.id);

          // Handle notification click based on type
          if (notification.data != null &&
              notification.data!.containsKey('journeyId') &&
              notification.type == 'payment_success') {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) =>
                    TicketScreen(journeyId: notification.data!['journeyId']),
              ),
            );
          }
        },
      ),
    );
  }
}
