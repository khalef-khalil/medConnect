/** @type {import('next').NextConfig} */
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
