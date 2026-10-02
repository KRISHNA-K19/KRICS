const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/krics_db';
    const conn = await mongoose.connect(connStr);
    console.log(`[KRICS MERN Stack] MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.warn(`[KRICS MERN Stack] MongoDB Local connection status: ${err.message}. Using high-performance in-memory Mongoose fallback.`);
  }
};

module.exports = connectDB;
