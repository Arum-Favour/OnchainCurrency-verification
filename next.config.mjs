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
  serverExternalPackages: ['mongoose', 'sharp'],
  // Additional configuration for development
  experimental: {
    // Enable if you're using any experimental features
  }
};

export default nextConfig;
