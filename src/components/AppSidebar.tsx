"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"; 
import { 
  Gavel,
  LayoutDashboard, 
  Presentation, 
  LogOut, 
  ChevronLeft,
  ChevronRight,
  User,
  ScanSearch,
  Menu,
  X,
  UserCircle
} from "lucide-react";

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter(); 
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState("");

  useEffect(() => {
    const checkUser = () => {
      const storedUser = localStorage.getItem('audit_user');
      if (storedUser) setCurrentUser(storedUser);
      else setCurrentUser("");
    };
    checkUser();
    window.addEventListener('auth-change', checkUser);
    return () => window.removeEventListener('auth-change', checkUser);
  }, [pathname]); 

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const handleSignOut = () => {
    // 1. Remove the key that AuthGate explicitly looks for
    localStorage.removeItem('app_access_granted'); 
    
    // 2. Remove all other user data
    localStorage.removeItem('audit_auth');
    localStorage.removeItem('audit_user');
    localStorage.removeItem('currentUser'); 
    
    // 3. Clear the cookie
    document.cookie = "audit_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    
    // 4. Force a hard reload to the root. 
    // This completely resets AuthGate's state. Since 'app_access_granted' 
    // is now gone, AuthGate will immediately show the Encrypted Gateway again!
    window.location.href = "/";
  };

  return (
    <>
      {/* --- MOBILE HAMBURGER BUTTON --- */}
      <button 
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 right-4 z-40 p-2.5 bg-[#060B19]/50 backdrop-blur-xl border border-white/10 rounded-2xl text-white shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:bg-white/10 transition-colors"
      >
        <Menu size={24} className="text-indigo-400" />
      </button>

      {/* --- MOBILE OVERLAY --- */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-[#060B19]/80 backdrop-blur-md z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* --- SIDEBAR (Reactbits Floating Island Style) --- */}
      <aside 
        className={`
          ${isCollapsed ? "w-24" : "w-72"}
          m-4 h-[calc(100vh-32px)] rounded-[2rem]
          bg-[#060B19]/70 backdrop-blur-3xl border border-white/10 text-white flex flex-col transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] relative
          fixed md:sticky top-4 left-0 z-50 shadow-[0_8px_32px_rgba(0,0,0,0.4)]
          ${isMobileOpen ? "translate-x-0" : "-translate-x-[120%] md:translate-x-0"}
        `}
      >
        {/* DESKTOP COLLAPSE BUTTON */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-4 top-12 z-50 items-center justify-center w-8 h-8 rounded-full bg-[#060B19] border border-white/10 text-indigo-400 hover:text-fuchsia-400 hover:border-fuchsia-500/50 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all hover:scale-110"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* MOBILE CLOSE BUTTON */}
        <button 
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden absolute top-5 right-5 p-2 bg-white/5 rounded-full text-indigo-300/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={18} />
        </button>

        {/* HEADER */}
        <div className={`p-6 pt-8 flex items-center ${isCollapsed ? "justify-center" : "gap-4"} border-b border-white/5 transition-all min-h-[100px]`}>
          <div className="relative group shrink-0">
            {/* Background Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-2xl blur opacity-25 group-hover:opacity-60 transition duration-500"></div>
            <div className="relative bg-[#060B19] border border-white/10 p-3 rounded-2xl flex items-center justify-center shadow-inner">
              
              {/* --- ANIMATED ORBIT LOGO (Kept exactly as requested) --- */}
              <div className="relative flex items-center justify-center w-6 h-6">
                <div className="absolute w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_12px_3px_rgba(232,121,249,0.8)] animate-pulse z-10" />
                <div className="absolute w-4 h-4 border border-fuchsia-500/30 border-b-fuchsia-400 rounded-full animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
                <div className="absolute w-6 h-6 border-[1.5px] border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" style={{ animationDuration: '4s' }} />
                <div className="absolute w-8 h-8 border border-cyan-500/20 border-r-cyan-400 rounded-full animate-spin" style={{ animationDuration: '6s' }} />
              </div>

            </div>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden whitespace-nowrap flex flex-col justify-center">
              <h1 className="font-black text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-white drop-shadow-sm">
                JJCP THESIS
              </h1>
              <p className="text-[9px] text-fuchsia-400/80 uppercase tracking-[0.2em] font-bold mt-0.5">Mentoring Hub 5.0</p>
            </div>
          )}
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {!isCollapsed && <p className="px-2 text-[10px] font-bold text-indigo-200/40 uppercase tracking-[0.25em] mb-4">Core</p>}
          
          <SidebarItem collapsed={isCollapsed} icon={<LayoutDashboard size={18} />} label="Dashboard" href="/" active={pathname === "/"} />
          <SidebarItem collapsed={isCollapsed} icon={<Presentation size={18} />} label="Mock Defense" href="/mock-defense" active={pathname === "/mock-defense"} />
          <SidebarItem collapsed={isCollapsed} icon={<Gavel size={18} />} label="Panel Board" href="/panel-board" active={pathname === "/panel-board"} />
          <SidebarItem collapsed={isCollapsed} icon={<ScanSearch size={18} />} label="Thesis Scanner" href="/scanner" active={pathname === "/scanner" } />
          
          <div className="py-4">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          
          {!isCollapsed && <p className="px-2 text-[10px] font-bold text-indigo-200/40 uppercase tracking-[0.25em] mb-4">Personal</p>}
          
          {/* UPDATED: Changed Settings to About Me */}
          <SidebarItem 
            collapsed={isCollapsed} 
            icon={<UserCircle size={18} />} 
            label="About Me" 
            href="/settings" 
            active={pathname === '/settings'} 
          />
        </nav>

        {/* FOOTER */}
        <div className="p-4 m-4 mt-0 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col gap-1 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none" />
          
          {currentUser && (
            <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-2"} py-2`}>
               <div className="relative flex-shrink-0">
                 <div className="absolute -inset-1 bg-cyan-500 rounded-full blur opacity-40 animate-pulse"></div>
                 <div className="relative p-1.5 bg-[#060B19] border border-cyan-500/50 rounded-full">
                    <User size={14} className="text-cyan-400" />
                 </div>
               </div>
               {!isCollapsed && (
                 <div className="overflow-hidden">
                   <p className="text-[9px] text-cyan-400 font-bold uppercase tracking-[0.2em] flex items-center gap-1.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
                      </span> 
                      Online
                   </p>
                   <p className="text-sm font-bold text-white truncate max-w-[120px]" title={currentUser}>
                     {currentUser}
                   </p>
                 </div>
               )}
            </div>
          )}

          <button 
            onClick={handleSignOut}
            className={`group relative overflow-hidden flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-3"} text-indigo-200/60 hover:text-white w-full py-2.5 rounded-xl transition-all duration-300 font-medium text-sm text-left mt-1 hover:bg-red-500/20 hover:border hover:border-red-500/30 border border-transparent`}
          >
            <LogOut size={16} className="relative z-10 group-hover:-translate-x-0.5 transition-transform duration-300 flex-shrink-0 group-hover:text-red-400" />
            {!isCollapsed && <span className="relative z-10 transition-transform duration-300 overflow-hidden whitespace-nowrap">Disconnect</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

// --- UPDATED PILL COMPONENT ---
function SidebarItem({ icon, label, href, active = false, collapsed = false }: any) {
  return (
    <Link 
      href={href} 
      className={`group relative flex items-center ${collapsed ? "justify-center" : "gap-3 px-3"} py-3 rounded-2xl transition-all duration-500 font-medium text-sm overflow-hidden ${
        active 
          ? "text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" 
          : "text-indigo-200/50 hover:text-white"
      }`}
      title={collapsed ? label : ""}
    >
      {/* Active State Background (Reactbits Glass Pill) */}
      {active && (
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/10 to-transparent border border-white/10 rounded-2xl" />
      )}

      {/* Active Left Glow Bar */}
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-cyan-400 to-indigo-500 rounded-r-full shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
      )}

      {/* Hover Spotlight Layer */}
      {!active && (
        <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />
      )}

      <div className={`relative z-10 flex items-center justify-center transition-all duration-500 ${active ? "text-indigo-300" : "group-hover:text-indigo-300 group-hover:scale-110"}`}>
        {icon}
      </div>
      
      {!collapsed && (
        <span className={`relative z-10 transition-all duration-500 ${!active && "group-hover:translate-x-1"}`}>
          {label}
        </span>
      )}
    </Link>
  );
}