import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Prevent Turbopack from trying to bundle jspdf's Node.js worker internals (fflate/node.cjs)
  // during the SSR pass. These are dynamically imported in the browser only.
  serverExternalPackages: ["jspdf", "jspdf-autotable", "fflate"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
    ],
  },
  // Custom headers for PWA and Security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://va.vercel-scripts.com",
              "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
              "connect-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.supabase.co wss://*.supabase.co https://vitals.vercel-insights.com",
              "img-src 'self' data: https://checkout.razorpay.com",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data: https://fonts.gstatic.com",
            ].join('; '),
          },
        ],
      },
      // Never cache payment endpoints or the callback
      {
        source: "/api/payment/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
