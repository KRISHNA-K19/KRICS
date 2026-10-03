const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState >= 1) {
    return;
  }

  const connStr = process.env.MONGO_ATLAS_URI || process.env.MONGO_URI || process.env.MONGODB_URI || (process.env.VERCEL ? '' : 'mongodb://127.0.0.1:27017/krics_db');

  if (!connStr) {
    console.warn('[KRICS MERN Stack] No MongoDB connection URI provided in environment. Please set MONGO_URI in Vercel settings.');
    return;
  }

  try {
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 5000
    });
    isConnected = true;
    console.log(`[KRICS MERN Stack] MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.warn(`[KRICS MERN Stack] MongoDB connection status: ${err.message}`);
  }
};

module.exports = connectDB;
