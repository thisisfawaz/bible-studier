/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  turbopack: {
    rules: {
      '*.ts': {
        loaders: ['ts-loader'],
        as: '*.js',
      },
      '*.tsx': {
        loaders: ['ts-loader'],
        as: '*.js',
      },
    },
  },
};

module.exports = nextConfig;