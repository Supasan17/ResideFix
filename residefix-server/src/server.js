/**
 * Entry point: connects to MongoDB, then starts the HTTP server.
 * Handles SIGINT/SIGTERM so Docker can stop the container cleanly.
 */
const config = require('./config/env');
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');

async function start() {
  try {
    await connectDB(config.mongoUri);
  } catch (err) {
    console.error(`MongoDB connection failed: ${err.message}`);
    console.error('Is MongoDB running and is MONGO_URI in .env correct?');
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`ResideFix API listening on http://localhost:${config.port} (${config.env})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
