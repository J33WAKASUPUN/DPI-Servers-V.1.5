const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ NDX MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes for better performance
    await createIndexes();
    
  } catch (error) {
    console.error('❌ NDX Database connection error:', error.message);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // Create indexes after connection is established
    const db = mongoose.connection.db;
    
    // Index for routes collection
    await db.collection('routes').createIndex({ name: 1 }, { unique: true });
    await db.collection('routes').createIndex({ 'stops.location': '2dsphere' });
    await db.collection('routes').createIndex({ 'path': '2dsphere' });
    
    // Index for journeys collection
    await db.collection('journeys').createIndex({ passengerId: 1, createdAt: -1 });
    await db.collection('journeys').createIndex({ scheduleId: 1 });
    await db.collection('journeys').createIndex({ ticketNumber: 1 }, { unique: true, sparse: true });
    await db.collection('journeys').createIndex({ status: 1 });
    
    // Index for schedules collection
    await db.collection('schedules').createIndex({ routeId: 1, departureTime: 1 });
    await db.collection('schedules').createIndex({ driverId: 1 });
    await db.collection('schedules').createIndex({ status: 1 });
    
    console.log('📊 NDX Database indexes created successfully');
  } catch (error) {
    console.error('⚠️ Error creating indexes:', error.message);
  }
};

module.exports = connectDB;