import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { hostname: "pbs.twimg.com", },
      {
        protocol: 'https',
        hostname: "edith.nyc3.cdn.digitaloceanspaces.com",
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    DAILY_POOL: process.env.DAILY_POOL,
    RECAPTCHA_SITE_KEY: process.env.RECAPTCHA_SITE_KEY,
    AWS_CDN_URL: process.env.AWS_CDN_URL,
  },
};

export default nextConfig;
