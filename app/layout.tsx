import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/shared/Navbar";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import IOSInstallPrompt from "@/components/pwa/IOSInstallPrompt";
import PWALoadingGuard from "@/components/pwa/PWALoadingGuard";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "75 Club | AI Attendance Planner & Bunk Manager",
  description:
    "Stop worrying about attendance. 75 Club helps you track classes, scan timetables with AI, and calculate exactly how many bunks you have left. Stay safe above 75%.",
  keywords: [
    "75 club",
    "attendance tracker",
    "bunk planner",
    "college attendance",
    "bunk calculator",
    "75 percent attendance",
  ],
  authors: [{ name: "75 Club Team" }],
  openGraph: {
    title: "75 Club | Your AI Bunk Buddy",
    description: "Track attendance and plan your bunks stress-free.",
    url: "https://75-club.vercel.app",
    siteName: "75 Club",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "75 Club | AI Attendance Planner",
    description: "Calculate safe bunks and track attendance effortlessly.",
  },
  verification: {
    google: "GMs_syvzDzng1D5OGkMN63xwPi2ZDGYB7csa38yFK0U",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "75 Club",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FF6B35",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* iOS PWA — explicit meta fallbacks for older iOS versions */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="75 Club" />
        {/* Prevent iOS Safari from auto-detecting phone numbers */}
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Auth loading gate — only activates in PWA standalone mode */}
        <PWALoadingGuard>
          <Navbar />
          {children}
          <Toaster />

          {/* PWA Install Prompts */}
          <InstallPrompt />
          <IOSInstallPrompt />
        </PWALoadingGuard>

        {/* Razorpay Script */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />

        {/*
         * Register our custom service worker.
         * Runs after hydration (afterInteractive) so it doesn't block LCP.
         * The SW file is served with Cache-Control: no-cache so every deploy
         * gets the latest version.
         */}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .then(function(reg) {
                  console.log('[SW] Registered:', reg.scope);
                })
                .catch(function(err) {
                  console.warn('[SW] Registration failed:', err);
                });
            }
          `}
        </Script>

        {/* Vercel Analytics */}
        <Analytics />
      </body>
    </html>
  );
}
