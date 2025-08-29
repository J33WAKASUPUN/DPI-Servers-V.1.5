import 'package:flutter/material.dart';

class AppColors {
  // Primary Colors
  static const Color primary = Color(0xFF6439FF); // rgb(100, 57, 255)
  static const Color primaryLight =
      Color(0xFF8566FF); // Lighter shade of primary
  static const Color primaryDark = Color(0xFF4F2DCB); // Darker shade of primary

  // Secondary Colors
  static const Color secondary = Color(0xFF4F75FF); // rgb(79, 117, 255)
  static const Color secondaryLight =
      Color(0xFF7C97FF); // Lighter shade of secondary
  static const Color secondaryDark =
      Color(0xFF3D5CCC); // Darker shade of secondary

  // Tertiary Colors
  static const Color tertiary = Color(0xFF00CCDD); // rgb(0, 204, 221)
  static const Color tertiaryLight =
      Color(0xFF4DDCE6); // Lighter shade of tertiary
  static const Color tertiaryDark =
      Color(0xFF00A3B1); // Darker shade of tertiary

  // Background Colors
  static const Color background = Color(0xFFFFFFFF);
  static const Color surface = Color(0xFFF5F5F5);

  // Text Colors
  static const Color textPrimary = Color(0xFF212121);
  static const Color textSecondary = Color(0xFF757575);
  static const Color textLight = Color(0xFFFFFFFF);

  // Status Colors
  static const Color error = Color(0xFFF7374F); // rgb(247, 55, 79) - Warning
  static const Color success =
      Color(0xFF9BEC00); // rgb(155, 236, 0) - Confirmation
  static const Color warning = Color(0xFFF7374F); // Same as error
  static const Color info = Color(0xFF4F75FF); // Using secondary color for info

  // Other Colors
  static const Color divider = Color(0xFFBDBDBD);
  static const Color disabled = Color(0xFFE0E0E0);
  static const Color overlay = Color(0x80000000);
  static const Color border = Color(0xFFDDDDDD);
}
