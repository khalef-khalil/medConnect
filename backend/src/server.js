require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { logger } = require('./utils/logger');
const { initializeResources } = require('./utils/init');
const { getPrimaryLocalIpAddress, logNetworkInterfaces } = require('./utils/network');
const routes = require('./routes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// CORS configuration 
const corsOptions = {
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));

// Add preflight handler for complex requests
app.options('*', cors(corsOptions));

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

// Also add the health check at the API root level for compatibility with the frontend
app.get(`${apiPrefix}/${process.env.API_VERSION || 'v1'}/health`, (req, res) => {
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  
  // Add CORS headers to error responses
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
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
    
    // Get the primary local IP address
    const localIp = getPrimaryLocalIpAddress();
    
    // Start HTTP server
    const HOST = process.env.HOST || '0.0.0.0';
    http.createServer(app).listen(PORT, HOST, () => {
      logger.info(`HTTP Server running on http://${HOST}:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      logger.info(`CORS enabled for ALL origins (development mode)`);
    });
    
    // Check for SSL certificates
    const certPath = path.join(__dirname, '../../frontend/certs/localhost.pem');
    const keyPath = path.join(__dirname, '../../frontend/certs/localhost-key.pem');
    
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      // Start HTTPS server
      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
      
      https.createServer(httpsOptions, app).listen(HTTPS_PORT, HOST, () => {
        logger.info(`HTTPS Server running on https://${HOST}:${HTTPS_PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      });
      
      // Log connection URLs
      logger.info('--------------------------------------');
      logger.info('The server is accessible at:');
      logger.info(`- Local HTTP:   http://localhost:${PORT}`);
      logger.info(`- Local HTTPS:  https://localhost:${HTTPS_PORT}`);
      logger.info(`- Network HTTP:  http://${localIp}:${PORT}`);
      logger.info(`- Network HTTPS: https://${localIp}:${HTTPS_PORT}`);
      logger.info('--------------------------------------');
    } else {
      logger.warn('SSL certificates not found. HTTPS server not started.');
      logger.warn(`Expected cert paths: ${certPath} and ${keyPath}`);
      
      // Log connection URLs (HTTP only)
      logger.info('--------------------------------------');
      logger.info('The server is accessible at:');
      logger.info(`- Local:   http://localhost:${PORT}`);
      logger.info(`- Network: http://${localIp}:${PORT}`);
      logger.info('--------------------------------------');
    }
    
    // Log all available network interfaces for easy connection
    logNetworkInterfaces();
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
})();

module.exports = app; 