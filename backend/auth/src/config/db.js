const mongoose = require('mongoose');

const connectDB = () => {
  const attempt = async () => {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI);
      console.log(`MongoDB Atlas connected: ${conn.connection.host}`);
    } catch (err) {
      console.error(`MongoDB connection failed, retrying in 30s: ${err.message}`);
      setTimeout(attempt, 30000);
    }
  };
  attempt();
};

module.exports = connectDB;
