"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"; 
import { 
  Gavel,
  LayoutDashboard, 
  Presentation, 
  Settings, 
  LogOut, 
  Box, 
  ChevronLeft,
  ChevronRight,
  User,
  ScanSearch,
  Menu,
  X
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

  if (pathname === '/login') return null;

  const handleSignOut = () => {
    localStorage.removeItem('audit_auth');
    localStorage.removeItem('audit_user');
    localStorage.removeItem('currentUser'); 
    document.cookie = "audit_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.dispatchEvent(new Event('auth-change'));
    router.push("/login");
  };

  return (
    <>
      {/* --- MOBILE HAMBURGER BUTTON --- */}
      <button 
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 right-4 z-40 p-2.5 bg-[#060B19]/50 backdrop-blur-xl border border-white/10 rounded-xl text-white shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:bg-white/10 transition-colors"
      >
        <Menu size={24} className="text-indigo-400" />
      </button>

      {/* --- MOBILE OVERLAY --- */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-[#060B19]/80 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside 
        className={`
          ${isCollapsed ? "w-20" : "w-64"}
          bg-[#060B19]/60 backdrop-blur-2xl text-white flex flex-col h-screen border-r border-white/5 transition-all duration-300 ease-in-out relative
          fixed md:sticky top-0 left-0 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.2)]
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* DESKTOP COLLAPSE BUTTON (Floating on the border) */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3.5 top-10 z-50 items-center justify-center w-7 h-7 rounded-full bg-[#060B19] border border-white/10 text-indigo-400 hover:text-fuchsia-400 hover:border-fuchsia-500/50 shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all hover:scale-110"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* MOBILE CLOSE BUTTON */}
        <button 
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden absolute top-4 right-4 p-2 text-indigo-300/50 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* HEADER */}
        <div className={`p-6 flex items-center ${isCollapsed ? "justify-center" : "gap-3"} border-b border-white/5 transition-all min-h-[85px]`}>
          <div className="relative group">
            {/* Background Glow */}
<div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
<div className="relative bg-[#060B19] border border-white/10 p-2 rounded-xl flex-shrink-0 flex items-center justify-center">
  
  {/* --- ANIMATED ORBIT LOGO --- */}
  <div className="relative flex items-center justify-center w-6 h-6">
    {/* Core Star/Planet */}
    <div className="absolute w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_12px_3px_rgba(232,121,249,0.8)] animate-pulse z-10" />
    
    {/* Orbit Ring 1 (Inner, Counter-Clockwise) */}
    <div 
      className="absolute w-4 h-4 border border-fuchsia-500/30 border-b-fuchsia-400 rounded-full animate-spin" 
      style={{ animationDuration: '3s', animationDirection: 'reverse' }} 
    />
    
    {/* Orbit Ring 2 (Middle, Clockwise) */}
    <div 
      className="absolute w-6 h-6 border-[1.5px] border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" 
      style={{ animationDuration: '4s' }} 
    />
    
    {/* Orbit Ring 3 (Outer, Slow Clockwise) */}
    <div 
      className="absolute w-8 h-8 border border-cyan-500/20 border-r-cyan-400 rounded-full animate-spin" 
      style={{ animationDuration: '6s' }} 
    />
  </div>

</div>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="font-black text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-indigo-400 animate-gradient-x">
                JJCP THESIS
              </h1>
              <p className="text-[9px] text-indigo-200/50 uppercase tracking-[0.2em] font-bold">MENTORING HUB v5.0</p>
            </div>
          )}
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto nebula-scrollbar">
          {!isCollapsed && <p className="px-3 text-[9px] font-bold text-indigo-200/30 uppercase tracking-[0.2em] mb-4 mt-2">Main Menu</p>}
          
          <SidebarItem collapsed={isCollapsed} icon={<LayoutDashboard size={20} />} label="Dashboard" href="/" active={pathname === "/"} />
          <SidebarItem collapsed={isCollapsed} icon={<Presentation size={20} />} label="Mock Defense" href="/mock-defense" active={pathname === "/mock-defense"} />
          <SidebarItem collapsed={isCollapsed} icon={<Gavel size={20} />} label="Panel Board" href="/panel-board" active={pathname === "/panel-board"} />
          <SidebarItem collapsed={isCollapsed} icon={<ScanSearch size={20} />} label="Thesis Scanner" href="/scanner" active={pathname === "/scanner" } />
          
          <div className="pt-6 pb-4">
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-4" />
          </div>
          
          {!isCollapsed && <p className="px-3 text-[9px] font-bold text-indigo-200/30 uppercase tracking-[0.2em] mb-4">System</p>}
          
          <SidebarItem 
  collapsed={isCollapsed} 
  icon={<Settings size={20} />} 
  label="Settings" 
  href="/settings" 
  active={pathname === '/settings'} 
/>
        </nav>

        {/* FOOTER */}
        <div className="p-4 border-t border-white/5 flex flex-col gap-2 bg-black/10">
          {currentUser && (
            <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-3"} mb-2 py-3 rounded-2xl bg-white/[0.02] border border-white/5`}>
               <div className="relative flex-shrink-0">
                 <div className="absolute -inset-1 bg-cyan-500 rounded-full blur opacity-30 animate-pulse"></div>
                 <div className="relative p-1.5 bg-[#060B19] border border-cyan-500/30 rounded-full">
                    <User size={16} className="text-cyan-400" />
                 </div>
               </div>
               {!isCollapsed && (
                 <div className="overflow-hidden">
                   <p className="text-[8px] text-cyan-400 font-bold uppercase tracking-[0.2em] flex items-center gap-1.5 mb-0.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
                      </span> 
                      Online
                   </p>
                   <p className="text-xs font-bold text-slate-200 truncate max-w-[120px]" title={currentUser}>
                     {currentUser}
                   </p>
                 </div>
               )}
            </div>
          )}

          <button 
            onClick={handleSignOut}
            className={`group relative overflow-hidden flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-4"} text-indigo-200/50 hover:text-red-400 w-full py-3 rounded-xl transition-all duration-300 font-medium text-sm text-left`}
          >
            {/* Subtle red hover background */}
            <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
            
            <LogOut size={20} className="relative z-10 group-hover:scale-110 transition-transform duration-300 flex-shrink-0" />
            {!isCollapsed && <span className="relative z-10 group-hover:translate-x-1 transition-transform duration-300 overflow-hidden whitespace-nowrap">Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarItem({ icon, label, href, active = false, collapsed = false }: any) {
  return (
    <Link 
      href={href} 
      className={`group relative flex items-center ${collapsed ? "justify-center" : "gap-3 px-4"} py-3 rounded-xl transition-all duration-300 font-medium text-sm overflow-hidden ${
        active 
          ? "text-white" 
          : "text-indigo-200/50 hover:text-indigo-100"
      }`}
      title={collapsed ? label : ""}
    >
      {/* --- ACTIVE STATE STYLING --- */}
      {active && (
        <>
          {/* Glowing Left Border */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-indigo-400 to-fuchsia-400 rounded-r-full shadow-[0_0_10px_rgba(232,121,249,0.8)]" />
          {/* Soft background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-transparent opacity-100" />
        </>
      )}

      {/* --- HOVER SPOTLIGHT (Reactbits style) --- */}
      {!active && (
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}

      {/* --- CONTENT --- */}
      <div className={`relative z-10 transition-transform duration-300 ${!active && "group-hover:scale-110 group-hover:text-indigo-300"}`}>
        {icon}
      </div>
      
      {!collapsed && (
        <span className={`relative z-10 transition-transform duration-300 ${!active && "group-hover:translate-x-1"}`}>
          {label}
        </span>
      )}
    </Link>
  );
}