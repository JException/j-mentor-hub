import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppSidebar from "./../components/AppSidebar";
import { SysAdminButton } from "./../components/SysAdminButton";

const inter = Inter({ subsets: ["latin"] });

// 1. VIEWPORT SETTINGS (Crucial for Mobile App Feel)
// This locks the zoom and sets the browser bar colors.
export const viewport: Viewport = {
  themeColor: "#f8fafc", // Matches your bg-slate-50
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zooming like a native app
};

// 2. METADATA & ICONS
export const metadata: Metadata = {
  title: "Hubble",
  description: "Admin Console",
  manifest: "/manifest.json", // Link to your PWA manifest
  
  // Icons for Browser Tabs & Home Screen
  icons: {
    icon: "/favicon.ico", // Standard favicon (put in /public)
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png", // Apple Touch Icon (180x180 png in /public)
  },

  // iOS Specific Settings
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mentor Hub",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body 
        className={`${inter.className} bg-slate-50 flex`}
        suppressHydrationWarning={true} 
      >
        <AppSidebar />
        
        {/* Added 'pt-[env(safe-area-inset-top)]' to handle iPhone Notch/Dynamic Island */}
        <main className="flex-1 h-screen overflow-y-auto p-4 md:p-8 relative pt-[env(safe-area-inset-top)]">
          {children}
          {/* 👇 This stays the same */}
          <SysAdminButton /> 
        </main>
      </body>
    </html>
  );
}