const mongoose = require('mongoose');
require('dotenv').config();

let isConnecting = false;

const connectDB = async () => {
  if (isConnecting || mongoose.connection.readyState === 1) return;
  isConnecting = true;
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/livefx_db',
      {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 60000,
        connectTimeoutMS: 30000,
        maxPoolSize: 20,
      }
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error (will retry in 5s): ${error.message}`);
    setTimeout(() => {
      isConnecting = false;
      connectDB();
    }, 5000);
    return;
  }
  isConnecting = false;
};

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting automatic reconnection...');
  setTimeout(() => connectDB(), 5000);
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB runtime error:', err.message);
});

module.exports = connectDB;
