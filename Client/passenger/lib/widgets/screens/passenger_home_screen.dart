import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:transit_lanka/core/providers/auth.provider.dart';
import 'package:transit_lanka/screens/passenger/screens/routes.screen.dart';
import 'package:transit_lanka/screens/passenger/screens/map.screen.dart';
import 'package:transit_lanka/screens/passenger/screens/profile.screen.dart';
import 'package:transit_lanka/screens/passenger/widgets/common/app.bar.dart';
import 'package:transit_lanka/screens/passenger/widgets/common/side.bar.dart';
import 'package:transit_lanka/screens/passenger/widgets/common/tab.bar.dart';
import 'package:transit_lanka/shared/constants/colors.dart';

class PassengerHomeScreen extends StatefulWidget {
  const PassengerHomeScreen({Key? key}) : super(key: key);

  @override
  State<PassengerHomeScreen> createState() => PassengerHomeScreenState();
}

class PassengerHomeScreenState extends State<PassengerHomeScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  PassengerTabItem _currentTab = PassengerTabItem.routes;
  PassengerSideBarItem _currentSideBarItem = PassengerSideBarItem.routes;

  // Map tab items to their corresponding titles
  final Map<PassengerTabItem, String> _tabTitles = {
    PassengerTabItem.routes: 'Routes',
    PassengerTabItem.map: 'Map',
    PassengerTabItem.profile: 'Profile',
  };

  // Map sidebar items to their corresponding titles
  final Map<PassengerSideBarItem, String> _sidebarTitles = {
    PassengerSideBarItem.routes: 'Routes',
    PassengerSideBarItem.map: 'Map',
    PassengerSideBarItem.profile: 'Profile',
    PassengerSideBarItem.settings: 'Settings',
    PassengerSideBarItem.logout: 'Logout',
  };

  // Get the current screen title based on selected item
  String get _currentTitle {
    return _sidebarTitles[_currentSideBarItem] ?? 'Transit Lanka';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      appBar: PassengerAppBar(
        title: _currentTitle,
        onMenuPressed: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      drawer: PassengerSideBar(
        currentItem: _currentSideBarItem,
        onItemSelected: _selectSideBarItem,
      ),
      body: _buildBody(),
      bottomNavigationBar: PassengerTabBar(
        currentTab: _currentTab,
        onTabSelected: selectTab,
      ),
    );
  }

  void selectTab(PassengerTabItem tabItem) {
    setState(() {
      _currentTab = tabItem;
      // Sync sidebar selection with tab selection
      switch (tabItem) {
        case PassengerTabItem.routes:
          _currentSideBarItem = PassengerSideBarItem.routes;
          break;
        case PassengerTabItem.map:
          _currentSideBarItem = PassengerSideBarItem.map;
          break;
        case PassengerTabItem.profile:
          _currentSideBarItem = PassengerSideBarItem.profile;
          break;
      }
    });
  }

  void _selectSideBarItem(PassengerSideBarItem item) {
    setState(() {
      _currentSideBarItem = item;
      // Sync tab selection with sidebar if applicable
      if (item == PassengerSideBarItem.routes) {
        _currentTab = PassengerTabItem.routes;
      } else if (item == PassengerSideBarItem.map) {
        _currentTab = PassengerTabItem.map;
      } else if (item == PassengerSideBarItem.profile) {
        _currentTab = PassengerTabItem.profile;
      }
      // Note: Settings doesn't have a corresponding tab
    });
  }

  Widget _buildBody() {
    switch (_currentSideBarItem) {
      case PassengerSideBarItem.routes:
        return const RoutesScreen();
      case PassengerSideBarItem.map:
        return const MapScreen();
      case PassengerSideBarItem.profile:
        return const PassengerProfileScreen(); // Changed from placeholder text to actual screen
      case PassengerSideBarItem.settings:
        return const Center(child: Text('Settings Screen'));
      case PassengerSideBarItem.logout:
        return const Center(child: Text('Logging out...'));
      default:
        return const RoutesScreen();
    }
  }
}
