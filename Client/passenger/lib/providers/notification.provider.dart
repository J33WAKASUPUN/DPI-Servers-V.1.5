import 'dart:async';
import 'package:flutter/material.dart';
import 'package:transit_lanka/core/models/notification.dart';
import 'package:transit_lanka/core/services/notification.service.dart';

class NotificationProvider with ChangeNotifier {
  final NotificationService _notificationService = NotificationService();

  List<NotificationModel> _notifications = [];
  bool _isLoading = false;
  String? _error;
  int _unreadCount = 0;

  List<NotificationModel> get notifications => _notifications;
  bool get isLoading => _isLoading;
  String? get error => _error;
  int get unreadCount => _unreadCount;

  // Load notifications from service
  Future<void> loadNotifications() async {
    _setLoading(true);
    try {
      final loadedNotifications = await _notificationService.getNotifications();
      _notifications = loadedNotifications;
      _calculateUnreadCount();
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _setLoading(false);
    }
  }

  // Add a new notification
  void addNotification(NotificationModel notification) {
    _notifications.insert(0, notification);
    _calculateUnreadCount();
    notifyListeners();
  }

  // Mark a notification as read
  void markAsRead(String notificationId) {
    final index = _notifications.indexWhere((n) => n.id == notificationId);
    if (index != -1) {
      _notifications[index] = _notifications[index].copyWith(isRead: true);
      _notificationService.markAsRead(notificationId);
      _calculateUnreadCount();
      notifyListeners();
    }
  }

  // Mark all notifications as read
  void markAllAsRead() {
    _notifications =
        _notifications.map((n) => n.copyWith(isRead: true)).toList();
    _notificationService.markAllAsRead();
    _unreadCount = 0;
    notifyListeners();
  }

  // Create and add a payment success notification
  void addPaymentSuccessNotification(
      String journeyId, String routeName, double amount) {
    final notification = NotificationModel(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: 'Payment Success',
      message:
          'Your payment of \$${amount.toStringAsFixed(2)} for $routeName has been completed successfully.',
      type: 'payment_success',
      timestamp: DateTime.now(),
      isRead: false,
      data: {'journeyId': journeyId},
    );

    addNotification(notification);
    _notificationService.saveNotification(notification);
  }

  // Calculate unread notifications count
  void _calculateUnreadCount() {
    _unreadCount = _notifications.where((n) => !n.isRead).length;
  }

  // Set loading state
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }
}
