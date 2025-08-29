class User {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String role; // 'driver' or 'passenger'
  final String? profileImageUrl;
  final String? token;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.role,
    this.profileImageUrl,
    this.token,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      role: json['role'] ?? '',
      profileImageUrl: json['profileImageUrl'] ?? json['image'],
      token: json['token'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone': phone,
      'role': role,
      'profileImageUrl': profileImageUrl,
      'token': token,
    };
  }

  bool get isDriver => role == 'driver';
  bool get isPassenger => role == 'passenger';
}
