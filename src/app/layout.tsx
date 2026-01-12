"use client";
import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
// This connects your Tailwind styles
import "./globals.css"; 
import { 
  Users, Calendar, LayoutDashboard, ChevronLeft, ChevronRight, GraduationCap 
} from 'lucide-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Schedule Parser', path: '/parser', icon: Calendar },
    { name: 'Thesis Groups', path: '/groups', icon: Users },
  ];

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Mentorship Hub v2.0</title>
        <meta name="description" content="Manage thesis groups and schedules" />
      </head>
      {/* 1. Changed min-h-screen to h-screen to fix the height to exactly one window size */}
      <body className="flex h-screen bg-[#f8fafc] text-slate-900 antialiased overflow-hidden">
        
        {/* SIDEBAR */}
        <aside 
          className={`${
            isCollapsed ? 'w-20' : 'w-72'
          } bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out relative z-50`}
        >
          
          {/* COLLAPSE TOGGLE BUTTON */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-10 bg-white border border-slate-200 rounded-full p-1 shadow-md hover:bg-slate-50 transition-colors z-50 text-slate-500"
          >
            {isCollapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
          </button>

          {/* LOGO SECTION */}
          <div className={`p-6 mb-4 flex items-center gap-4 ${isCollapsed ? 'justify-center' : ''}`}>
             <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-200">
                <GraduationCap size={24} />
             </div>
             {!isCollapsed && (
               <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                 <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 leading-none mb-1">Mentorship</h2>
                 <p className="text-lg font-bold text-slate-900 leading-none">Hub v2.0</p>
               </div>
             )}
          </div>

          {/* NAVIGATION */}
          <nav className="flex-1 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  href={item.path}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon size={20} className="shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* MAIN CONTENT AREA */}
        {/* 2. Added h-full and overflow-y-auto to let this section scroll independently */}
        <main className="flex-1 h-full overflow-y-auto bg-[#f8fafc] relative scroll-smooth">
          <div className="p-6 md:p-12 max-w-6xl mx-auto">
            {children}
          </div>
        </main>

      </body>
    </html>
  );
}