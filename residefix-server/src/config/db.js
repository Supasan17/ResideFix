const mongoose = require('mongoose');

/**
 * Opens the Mongoose connection. Kept separate from app.js so tests can
 * connect to an in-memory database instead.
 */
async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.connection.close();
}

module.exports = { connectDB, disconnectDB };
