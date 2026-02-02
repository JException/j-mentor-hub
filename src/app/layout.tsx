import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppSidebar from "@/components/AppSidebar"; 
// 👇 CHANGED: Added curly braces { }
import { SysAdminButton } from "@/components/SysAdminButton"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JJCP Mentor Hub",
  description: "Admin Console",
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
        <main className="flex-1 h-screen overflow-y-auto p-4 md:p-8 relative">
          {children}
          {/* 👇 This stays the same */}
          <SysAdminButton /> 
        </main>
      </body>
    </html>
  );
}