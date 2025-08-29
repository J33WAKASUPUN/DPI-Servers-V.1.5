class Driver {
  final String id;
  final String firstName;
  final String lastName;
  final String email;
  final String phone;
  final String licenseNumber;
  final String licenseExpiry;
  final String vehicleNumber;
  final String vehicleType;
  final String status;
  final bool isVerified;
  final bool isOnline;

  Driver({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.phone,
    required this.licenseNumber,
    required this.licenseExpiry,
    required this.vehicleNumber,
    required this.vehicleType,
    required this.status,
    required this.isVerified,
    this.isOnline = false,
  });

  // Computed property for full name
  String get name => '$firstName $lastName';

  // Computed property for initials
  String get initials {
    String firstInitial =
        firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    String lastInitial = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    return '$firstInitial$lastInitial';
  }

  // Computed property for single initial (for avatar)
  String get firstInitial {
    return firstName.isNotEmpty ? firstName[0].toUpperCase() : 'D';
  }

  // Computed property for active status
  bool get isActive => status == 'active' && isVerified;

  factory Driver.fromJson(Map<String, dynamic> json) {
    return Driver(
      id: json['id'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      licenseNumber: json['licenseNumber'] ?? '',
      licenseExpiry: json['licenseExpiry'] ?? '',
      vehicleNumber: json['vehicleNumber'] ?? '',
      vehicleType: json['vehicleType'] ?? 'bus',
      status: json['status'] ?? 'pending',
      isVerified: json['isVerified'] ?? false,
      isOnline: json['isOnline'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      'phone': phone,
      'licenseNumber': licenseNumber,
      'licenseExpiry': licenseExpiry,
      'vehicleNumber': vehicleNumber,
      'vehicleType': vehicleType,
      'status': status,
      'isVerified': isVerified,
      'isOnline': isOnline,
    };
  }
}
