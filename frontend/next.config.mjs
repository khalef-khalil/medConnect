/** @type {import('next').NextConfig} */
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Certificate paths
const keyPath = join(__dirname, 'certs', 'localhost-key.pem');
const certPath = join(__dirname, 'certs', 'localhost.pem');

// Check if certificates exist
const certsExist = existsSync(keyPath) && existsSync(certPath);

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost', '192.168.1.15', 'medconnect-files.s3.amazonaws.com'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
        port: '3001',
        pathname: '/api/**',
      },
    ],
  },
  // Enable HTTPS for local development to allow camera/microphone access on local network
  // This enables secure connections which Chrome requires for getUserMedia() on non-localhost
  devServer: {
    https: process.env.NODE_ENV === 'development' && process.env.HTTPS === 'true' ? 
      certsExist ? {
        key: keyPath,
        cert: certPath,
      } : true // Use Next.js auto-generated certs if our certs don't exist
    : false,
  },
  // This configuration allows Next.js to be accessible on your local network
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ]
  },
  // Dynamic rewrites to support any host
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: '/api/proxy/:path*', // Use a Next.js API route as proxy
        }
      ]
    };
  },
};

export default nextConfig;
