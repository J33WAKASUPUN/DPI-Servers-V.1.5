# Bus Driver App

A comprehensive Flutter application for bus drivers with schedule management, journey tracking, and live location services.

## Features

- **Driver Authentication**: Secure login and registration system
- **Schedule Management**: View and select available bus schedules
- **Journey Tracking**: Start and manage bus journeys with live GPS tracking
- **Live Location**: Real-time location updates during active journeys
- **Google Maps Integration**: Interactive map view with current location
- **Dark Theme**: Modern dark UI design optimized for mobile use

## Screenshots

### Login & Registration
- Clean, professional login interface
- Driver registration with license validation
- Secure authentication with token management

### Dashboard
- Welcome screen with driver status
- Quick access to schedules and active journeys
- Today's overview with statistics

### Schedule Selection
- List of available schedules with route details
- Schedule status indicators (Active, Pending, Completed)
- Start journey functionality

### Journey Tracking
- Google Maps integration with live location
- Real-time GPS tracking
- Journey controls (Start/Stop tracking)
- Location accuracy and speed display

## Setup Instructions

### Prerequisites
- Flutter SDK (3.0.0 or higher)
- Android Studio / VS Code
- Google Maps API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bus_driver_app
   ```

2. **Install dependencies**
   ```bash
   flutter pub get
   ```

3. **Configure Google Maps**
   - Get a Google Maps API Key from Google Cloud Console
   - Enable Maps SDK for Android
   - Replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` in `android/app/src/main/AndroidManifest.xml`

4. **Update API endpoints**
   - Modify `lib/config/api_endpoints.dart` with your server URLs
   - Ensure your API Gateway is running on the specified port

5. **Run the app**
   ```bash
   flutter run
   ```

### API Configuration

The app expects the following API endpoints to be available:

- **Authentication**: `/api/driver/auth/login`, `/api/driver/auth/register`
- **Schedules**: `/api/schedules`, `/api/schedules/active`
- **Journeys**: `/api/journeys/start`, `/api/journeys/{id}`
- **Tracking**: `/api/driver/tracking/start`, `/api/driver/tracking/update`

Make sure your backend API Gateway is configured to route these endpoints correctly.

### Permissions

The app requires the following permissions:
- Location (Fine and Coarse)
- Internet access
- Background location (for tracking during journeys)

## Project Structure

```
lib/
├── config/
│   ├── api_endpoints.dart    # API endpoint configurations
│   └── theme.dart           # App theme and colors
├── models/
│   ├── driver.dart          # Driver data model
│   ├── schedule.dart        # Schedule data model
│   └── journey.dart         # Journey and location models
├── providers/
│   ├── auth_provider.dart   # Authentication state management
│   ├── schedule_provider.dart # Schedule state management
│   ├── journey_provider.dart  # Journey state management
│   └── location_provider.dart # Location tracking management
├── screens/
│   ├── auth/
│   │   ├── login_screen.dart
│   │   └── register_screen.dart
│   └── home/
│       ├── home_screen.dart
│       ├── schedule_selection_screen.dart
│       └── journey_screen.dart
├── services/
│   └── api_service.dart     # HTTP API service
├── utils/
│   └── shared_prefs.dart    # Local storage utilities
├── widgets/
│   └── loading_overlay.dart # Reusable UI components
└── main.dart               # App entry point
```

## Dependencies

- **flutter**: Framework
- **http**: API communication
- **provider**: State management
- **shared_preferences**: Local storage
- **google_maps_flutter**: Map integration
- **location**: Location services
- **geolocator**: GPS positioning
- **permission_handler**: Permission management

## Color Scheme

The app uses a dark theme with the following color palette:
- **Primary Dark**: #14171e (main background)
- **Surface Dark**: #181d23 (cards and surfaces)
- **Success Green**: #2ba471 (operational status)
- **Warning Yellow**: #e6a935 (warning status)
- **Error Red**: #d03437 (alerts and errors)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.