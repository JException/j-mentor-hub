import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthGate from "../components/AuthGate";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#f8fafc",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Hubble",
  description: "Admin Console",
  manifest: "/manifest.json", 
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" }, 
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hubble",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className={`${inter.className} bg-slate-50 antialiased overflow-hidden`}
        suppressHydrationWarning
      >
        {/* We pass the children into your security gate */}
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}