const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ SLUDI MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes for better performance
    await createIndexes();
    
  } catch (error) {
    console.error('❌ SLUDI Database connection error:', error.message);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // Create indexes after connection is established
    const db = mongoose.connection.db;
    
    // Index for citizens collection
    await db.collection('citizens').createIndex({ citizenId: 1 }, { unique: true });
    await db.collection('citizens').createIndex({ email: 1 }, { unique: true });
    await db.collection('citizens').createIndex({ phoneNumber: 1 });
    
    // Index for tokens collection
    await db.collection('tokens').createIndex({ token: 1 }, { unique: true });
    await db.collection('tokens').createIndex({ citizenId: 1 });
    await db.collection('tokens').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    
    console.log('📊 SLUDI Database indexes created successfully');
  } catch (error) {
    console.error('⚠️ Error creating indexes:', error.message);
  }
};

module.exports = connectDB;