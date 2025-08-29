class Passenger {
  final String id;
  final String name;
  final String phone;
  final String email;
  final Map<String, String> addresses;
  final String? image;
  final List<String> favoriteRoutes;

  Passenger({
    required this.id,
    required this.name,
    required this.phone,
    required this.email,
    required this.addresses,
    this.image,
    this.favoriteRoutes = const [],
  });

  factory Passenger.fromJson(Map<String, dynamic> json) {
    // Handle addresses which can be a map of strings
    final Map<String, String> addressMap = {};
    if (json['addresses'] != null && json['addresses'] is Map) {
      json['addresses'].forEach((key, value) {
        if (value is String) {
          addressMap[key] = value;
        }
      });
    }

    // Handle favorite routes which is an array of route IDs
    List<String> favorites = [];
    if (json['favoriteRoutes'] != null && json['favoriteRoutes'] is List) {
      favorites = List<String>.from(json['favoriteRoutes']
          .map((route) => route is String ? route : route['_id'].toString()));
    }

    return Passenger(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      email: json['email'] ?? '',
      addresses: addressMap,
      image: json['image'],
      favoriteRoutes: favorites,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
      'phone': phone,
      'email': email,
      'addresses': addresses,
      'image': image,
      'favoriteRoutes': favoriteRoutes,
    };
  }

  // Check if a route is in favorites
  bool isFavorite(String routeId) {
    return favoriteRoutes.contains(routeId);
  }

  // Add a route to favorites
  Future<bool> addToFavorites(String routeId) async {
    try {
      // This would call your API service to add the route
      // Then update the local model if successful
      return true;
    } catch (e) {
      return false;
    }
  }

  // Remove a route from favorites
  Future<bool> removeFromFavorites(String routeId) async {
    try {
      // This would call your API service to remove the route
      // Then update the local model if successful
      return true;
    } catch (e) {
      return false;
    }
  }
}
