/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... your existing config
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.youtube.com https://www.youtube-nocookie.com;"
          }
        ],
      },
    ];
  },
};

module.exports = nextConfig;