/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow ngrok and other development tunneling services
  allowedDevOrigins: [
    'ngrok.io',
    'ngrok-free.app',
    'ngrok.app',
    'localhost',
    '127.0.0.1'
  ],
  // Fix workspace root detection - explicitly set to current directory
  outputFileTracingRoot: process.cwd(),
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',
  },
  // Additional configuration for development
  experimental: {
    // Enable if you're using any experimental features
  }
};

export default nextConfig;
