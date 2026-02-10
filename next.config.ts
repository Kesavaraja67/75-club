import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  // swcMinify is removed as it's not a valid pwa option
  disable: process.env.NODE_ENV === "development", // Disable PWA in development
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        // Don't cache Supabase API calls
        urlPattern: /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/rest\/v1\/.*$/,
        handler: 'NetworkOnly',
      },
      {
        // Don't cache Dashboard pages (FORCE server auth check)
        urlPattern: /\/dashboard.*/,
        handler: 'NetworkOnly',
      },
      {
        // Don't cache internal API calls
        urlPattern: /\/api\/.*$/,
        handler: 'NetworkOnly',
      },
      {
        // Don't cache Next.js data
        urlPattern: /\/_next\/data\/.*$/,
        handler: 'NetworkOnly',
      },
      {
        // Cache images, but revalidate
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'images',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
          },
        },
      },
      {
        // Cache other static assets
        urlPattern: /\.(?:js|css|woff2?|eot|ttf|otf)$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-resources',
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  turbopack: {},
  async headers() {
    return [
      {
        source: '/dashboard/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'no-store',
          },
          {
            key: 'Vercel-CDN-Cache-Control',
            value: 'no-store',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'no-store',
          },
          {
            key: 'Vercel-CDN-Cache-Control',
            value: 'no-store',
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
