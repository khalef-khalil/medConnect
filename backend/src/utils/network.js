/**
 * Network utilities
 */
const os = require('os');
const { logger } = require('./logger');

/**
 * Get local IP addresses
 * @returns {string[]} Array of local IP addresses
 */
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip loopback (127.0.0.1) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  return addresses;
}

/**
 * Gets the primary local network IP address (first non-internal IPv4 address)
 * @returns {string} The primary local IP address, or 'localhost' if none found
 */
function getPrimaryLocalIpAddress() {
  const addresses = getLocalIpAddresses();
  return addresses.length > 0 ? addresses[0] : 'localhost';
}

/**
 * Log all network interfaces
 */
function logNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  logger.info('Available network interfaces:');
  
  for (const name of Object.keys(interfaces)) {
    logger.info(`Interface: ${name}`);
    for (const iface of interfaces[name]) {
      logger.info(`  ${iface.family} - ${iface.address} ${iface.internal ? '(internal)' : ''}`);
    }
  }
}

module.exports = {
  getLocalIpAddresses,
  getPrimaryLocalIpAddress,
  logNetworkInterfaces
}; 