import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthGate from "../components/AuthGate";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#060B19", // 👈 Changed this to match the dark Nebula theme!
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
    <html lang="en" suppressHydrationWarning className="dark">
      <body 
        // 👇 Removed bg-slate-50 and added bg-[#060B19] text-slate-200
        className={`${inter.className} bg-[#060B19] text-slate-200 antialiased overflow-hidden`}
        suppressHydrationWarning
      >
        {/* We pass the children into your security gate */}
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}