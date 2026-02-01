"use client";
import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import "./globals.css"; 
import { 
  Users, Calendar, LayoutDashboard, ChevronLeft, ChevronRight, GraduationCap, 
  Medal, List, CheckSquare, Menu, X, 
  FileText, Presentation, History as HistoryIcon
} from 'lucide-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // State for Desktop Collapse
  const [isCollapsed, setIsCollapsed] = useState(false);
  // State for Mobile Menu Open/Close
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Schedule Parser', path: '/parser', icon: Calendar },
    { name: 'Thesis Groups', path: '/groups', icon: Users },
    { name: 'Deliverables', path: '/deliverables', icon: CheckSquare },
    
    // --- NEW TAB ADDED HERE ---
    { name: 'Mock Defense', path: '/mock-defense', icon: Presentation },

    { name: 'Files Repository', path: '/files', icon: FileText }, 
    { name: 'Leaderboards', path: '/leaderboards', icon: Medal },
    { name: 'Masterlist', path: '/masterlist', icon: List },
    { name: 'Audit Trail', path: '/audittrail', icon: HistoryIcon },
  ];

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>JJCP Mentorship Hub v3.0</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>

      {/* LAYOUT CHANGE: 
        1. Added 'flex-col md:flex-row' to switch layout direction based on screen size.
      */}
      <body 
        className="flex h-screen flex-col md:flex-row bg-background text-foreground antialiased overflow-hidden" 
        suppressHydrationWarning
      >
        
        {/* --- MOBILE HEADER (Visible only on small screens) --- */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 shrink-0 z-30">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <GraduationCap size={20} />
            </div>
            <span className="font-bold text-lg">Hub v3.0</span>
          </div>
          <button 
            onClick={() => setIsMobileOpen(true)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* --- MOBILE OVERLAY BACKDROP --- */}
        {/* Clicking this dark background closes the menu on mobile */}
        {isMobileOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* --- SIDEBAR --- */}
        <aside 
          className={`
            /* MOBILE STYLES (Fixed Overlay) */
            fixed inset-y-0 left-0 z-50 h-full shadow-2xl transform transition-transform duration-300 ease-in-out
            ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
            
            /* DESKTOP STYLES (Static Side-by-Side) */
            md:relative md:translate-x-0 md:shadow-none md:flex md:flex-col
            
            /* DYNAMIC WIDTH (Desktop only) */
            ${isCollapsed ? 'md:w-20' : 'md:w-72'}
            w-72 /* Mobile width is always 72 */

            w-[280px] bg-white border-r border-slate-200
          `}
        >
          
          {/* CLOSE BUTTON (Mobile Only) */}
          <button 
            onClick={() => setIsMobileOpen(false)}
            className="absolute top-4 right-4 p-1 md:hidden text-slate-500 hover:bg-slate-100 rounded-full"
          >
            <X size={20} />
          </button>

          {/* DESKTOP COLLAPSE TOGGLE (Hidden on Mobile) */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:block absolute -right-3 top-10 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 border border-slate-200 rounded-full p-1 shadow-md hover:bg-slate-50 transition-colors z-50 text-slate-500"
          >
            {isCollapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
          </button>

          {/* LOGO SECTION */}
          <div className={`p-6 mb-4 flex items-center gap-4 ${isCollapsed ? 'md:justify-center' : ''}`}>
             <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-200">
                <GraduationCap size={24} />
             </div>
             {/* Text is hidden if collapsed on Desktop, but ALWAYS visible on Mobile menu */}
             <div className={`${isCollapsed ? 'md:hidden' : 'block'} animate-in fade-in duration-300`}>
               <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 leading-none mb-1">JJCP Mentorship</h2>
               <p className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">Hub v3.0</p>
             </div>
          </div>

          {/* NAVIGATION */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  href={item.path}
                  onClick={() => setIsMobileOpen(false)} // Close menu when clicking a link on mobile
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <item.icon size={20} className="shrink-0" />
                  {/* Label is hidden if collapsed on Desktop, but ALWAYS visible on Mobile */}
                  <span className={`${isCollapsed ? 'md:hidden' : 'block'} truncate`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 h-full overflow-y-auto bg-background relative w-full">
          <div className="p-4 md:p-12 max-w-6xl mx-auto">
            {children}
          </div>
        </main>

      </body>
    </html>
  );
}