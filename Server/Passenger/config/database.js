const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ Passenger MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Create indexes for better performance
    await createIndexes();
    
  } catch (error) {
    console.error('❌ Passenger Database connection error:', error.message);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // Create indexes after connection is established
    const db = mongoose.connection.db;
    
    // Index for passengers collection
    await db.collection('passengers').createIndex({ citizenId: 1 }, { unique: true });
    await db.collection('passengers').createIndex({ email: 1 }, { unique: true });
    await db.collection('passengers').createIndex({ phone: 1 });
    
    // Index for bookings collection
    await db.collection('bookings').createIndex({ passengerId: 1, createdAt: -1 });
    await db.collection('bookings').createIndex({ scheduleId: 1 });
    await db.collection('bookings').createIndex({ status: 1 });
    
    // Index for tickets collection
    await db.collection('tickets').createIndex({ bookingId: 1 });
    await db.collection('tickets').createIndex({ qrCode: 1 }, { unique: true });
    await db.collection('tickets').createIndex({ validUntil: 1 });
    
    console.log('📊 Passenger Database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
};

module.exports = connectDB;