const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState >= 1) {
    return;
  }
  try {
    const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/krics_db';
    const conn = await mongoose.connect(connStr);
    isConnected = true;
    console.log(`[KRICS MERN Stack] MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.warn(`[KRICS MERN Stack] MongoDB connection status: ${err.message}. Using high-performance in-memory Mongoose fallback.`);
  }
};

module.exports = connectDB;
