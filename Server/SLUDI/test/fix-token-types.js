const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB for token cleanup');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

const fixTokenTypes = async () => {
  try {
    // Delete all existing tokens with invalid types
    const result = await mongoose.connection.db.collection('tokens').deleteMany({
      tokenType: { $nin: ['access', 'refresh', 'oauth', 'sludi_oauth', 'sludi_auth_code', 'sludi_access'] }
    });
    
    console.log('🧹 Cleaned up invalid tokens:', result.deletedCount);
    
    // Also clean up any expired tokens
    const expiredResult = await mongoose.connection.db.collection('tokens').deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    console.log('⏰ Cleaned up expired tokens:', expiredResult.deletedCount);
    
    console.log('✅ Token cleanup completed');
    
  } catch (error) {
    console.error('❌ Token cleanup error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

// Run the cleanup
connectDB().then(() => {
  fixTokenTypes();
});