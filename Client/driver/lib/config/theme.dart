import 'package:flutter/material.dart';

class AppTheme {
  // Color palette
  static const Color primaryDark = Color(0xFF14171e);
  static const Color secondaryDark = Color(0xFF181b22);
  static const Color tertiaryDark = Color(0xFF0b0e13);
  static const Color surfaceDark = Color(0xFF181d23);
  static const Color backgroundDark = Color(0xFF101318);
  
  static const Color errorRed = Color(0xFFd03437);
  static const Color successGreen = Color(0xFF2ba471);
  static const Color warningYellow = Color(0xFFe6a935);
  
  static const Color textPrimary = Colors.white;
  static const Color textSecondary = Color(0xFFB0B0B0);

  static ThemeData darkTheme = ThemeData(
    brightness: Brightness.dark,
    primaryColor: primaryDark,
    scaffoldBackgroundColor: primaryDark,
    
    colorScheme: const ColorScheme.dark(
      primary: successGreen,
      secondary: warningYellow,
      error: errorRed,
      surface: surfaceDark,
      background: backgroundDark,
    ),

    appBarTheme: const AppBarTheme(
      backgroundColor: secondaryDark,
      elevation: 0,
      titleTextStyle: TextStyle(
        color: textPrimary,
        fontSize: 20,
        fontWeight: FontWeight.bold,
      ),
      iconTheme: IconThemeData(color: textPrimary),
    ),

    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: successGreen,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    ),

    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: surfaceDark,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      hintStyle: const TextStyle(color: textSecondary),
      labelStyle: const TextStyle(color: textSecondary),
    ),

    cardTheme: CardTheme(
      color: surfaceDark,
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
    ),

    textTheme: const TextTheme(
      headlineLarge: TextStyle(color: textPrimary, fontWeight: FontWeight.bold),
      headlineMedium: TextStyle(color: textPrimary, fontWeight: FontWeight.bold),
      bodyLarge: TextStyle(color: textPrimary),
      bodyMedium: TextStyle(color: textSecondary),
    ),
  );
}