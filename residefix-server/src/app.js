/**
 * Builds the Express application without starting a server or opening a
 * database connection, so Supertest can import it directly in tests.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');

const config = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');

const app = express();

// Behind Docker/Render/etc. the client IP arrives in X-Forwarded-For (needed by the rate limiter).
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser tools (curl, Postman, health checks) that send no Origin header.
      if (!origin || config.clientOrigins.includes('*') || config.clientOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new ApiError(403, `Origin ${origin} is not allowed by CORS`));
    },
  })
);
app.use(express.json({ limit: '100kb' }));
if (!config.isTest) app.use(morgan(config.isProduction ? 'combined' : 'dev'));

// Health check used by Docker, CI smoke tests and uptime monitors.
app.get('/api/health', (_req, res) => {
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'residefix-api',
      environment: config.env,
      database: dbStates[mongoose.connection.readyState] || 'unknown',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

app.use('/api', apiLimiter);
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/properties', require('./routes/propertyRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));

app.get('/', (_req, res) =>
  res.json({ success: true, message: 'ResideFix API. See /api/health for status.' })
);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
