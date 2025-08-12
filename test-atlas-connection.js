const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Test connection to MongoDB Atlas
async function testAtlasConnection() {
  try {
    console.log('🔄 Testing MongoDB Atlas connection...');
    
    // Connect to MongoDB Atlas
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // Test database operations
    const testCollection = mongoose.connection.db.collection('test');
    
    // Insert a test document
    const testDoc = {
      message: 'Hello MongoDB Atlas!',
      timestamp: new Date(),
      test: true
    };
    
    const insertResult = await testCollection.insertOne(testDoc);
    console.log('✅ Test document inserted:', insertResult.insertedId);
    
    // Read the test document
    const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId });
    console.log('✅ Test document retrieved:', foundDoc.message);
    
    // Delete the test document
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('✅ Test document deleted');
    
    // List all collections in the database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Available collections:', collections.map(c => c.name));
    
    console.log('🎉 MongoDB Atlas connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ MongoDB Atlas connection test failed:', error.message);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 Connection closed');
    process.exit(0);
  }
}

// Run the test
testAtlasConnection();