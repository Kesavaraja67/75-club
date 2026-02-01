import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/shared/Navbar";
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
  description: "Stop worrying about attendance. 75 Club helps you track classes, scan timetables with AI, and calculate exactly how many bunks you have left. Stay safe above 75%.",
  keywords: ["75 club", "attendance tracker", "bunk planner", "college attendance", "bunk calculator", "75 percent attendance"],
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
    apple: "/icon-512.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FF6B35",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar />
        {children}
        <Toaster />
        
        {/* Razorpay Script */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
