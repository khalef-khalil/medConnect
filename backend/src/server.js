require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { logger } = require('./utils/logger');
const { initializeResources } = require('./utils/init');
const routes = require('./routes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Debug middleware to log parsed body
app.use((req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    logger.info(`Parsed request body for ${req.method} ${req.url}:`, req.body);
  }
  next();
});

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// API routes
const apiPrefix = process.env.API_PREFIX || '/api';
app.use(`${apiPrefix}/${process.env.API_VERSION || 'v1'}`, routes);

// Health check endpoint - moved outside the API routes to be directly accessible
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV });
});

// Also add the health check at the API root level for compatibility with the test script
app.get(`${apiPrefix}/health`, (req, res) => {
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Initialize AWS resources and start server
(async () => {
  try {
    // Initialize AWS resources
    await initializeResources();
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
})();

module.exports = app; 