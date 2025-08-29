const mongoose = require('mongoose');
const Citizen = require('../models/Citizen');
const connectDB = require('../config/database');
require('dotenv').config();

const seedCitizens = [
  {
    citizenId: 'SL2024001001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phoneNumber: '+94771234567',
    password: 'password123',
    dateOfBirth: new Date('1990-01-15'),
    address: {
      street: '123 Main Street',
      city: 'Colombo',
      state: 'Western',
      zipCode: '00100',
      country: 'Sri Lanka'
    },
    isVerified: true,
    role: 'citizen'
  },
  {
    citizenId: 'SL2024001002',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phoneNumber: '+94771234568',
    password: 'password123',
    dateOfBirth: new Date('1985-05-20'),
    address: {
      street: '456 Second Street',
      city: 'Kandy',
      state: 'Central',
      zipCode: '20000',
      country: 'Sri Lanka'
    },
    isVerified: true,
    role: 'citizen'
  },
  {
    citizenId: 'SL2024001003',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@sludi.gov.lk',
    phoneNumber: '+94771234569',
    password: 'admin123',
    dateOfBirth: new Date('1980-12-10'),
    address: {
      street: '789 Government Street',
      city: 'Colombo',
      state: 'Western',
      zipCode: '00100',
      country: 'Sri Lanka'
    },
    isVerified: true,
    role: 'admin'
  }
];

const seedDatabase = async () => {
  try {
    await connectDB();
    
    console.log('🌱 Seeding SLUDI database...');
    
    // Clear existing data
    await Citizen.deleteMany({});
    console.log('🗑️  Cleared existing citizens');
    
    // Insert seed data
    const citizens = await Citizen.insertMany(seedCitizens);
    console.log(`✅ Created ${citizens.length} citizens`);
    
    console.log('🎉 SLUDI database seeded successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

// Run seed if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, seedCitizens };