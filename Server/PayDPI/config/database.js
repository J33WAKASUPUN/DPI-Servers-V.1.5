const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ PayDPI MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes
    await createIndexes();
  } catch (error) {
    console.error('❌ PayDPI Database connection error:', error.message);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    const Transaction = require('../models/Transaction');
    const Subsidy = require('../models/Subsidy');
    
    // Transaction indexes
    await Transaction.collection.createIndex({ 
      journeyId: 1, 
      passengerId: 1 
    });
    await Transaction.collection.createIndex({ 
      status: 1, 
      createdAt: -1 
    });
    await Transaction.collection.createIndex({ 
      paymentMethod: 1 
    });
    
    // Subsidy indexes
    await Subsidy.collection.createIndex({ 
      citizenId: 1, 
      createdAt: -1 
    });
    await Subsidy.collection.createIndex({ 
      subsidyType: 1, 
      status: 1 
    });
    
    console.log('📊 PayDPI Database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
};

module.exports = connectDB;