"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"; 
import { 
  LayoutDashboard, 
  Presentation, 
  Settings, 
  LogOut, 
  Box, 
  ChevronLeft,
  ChevronRight,
  User 
} from "lucide-react";

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter(); 
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState("");

  // ✅ 1. useEffect to sync User State
  useEffect(() => {
    const checkUser = () => {
      // Get the user from the standardized key
      const storedUser = localStorage.getItem('audit_user');
      if (storedUser) {
        setCurrentUser(storedUser);
      } else {
        setCurrentUser("");
      }
    };

    // Run on mount
    checkUser();

    // Listen for login/logout events to update immediately
    window.addEventListener('auth-change', checkUser);

    // Cleanup listener
    return () => window.removeEventListener('auth-change', checkUser);
    
  }, [pathname]); 

  // ✅ 2. Hide Sidebar on Login Page
  if (pathname === '/login') return null;

  const handleSignOut = () => {
    // 1. Clear Client Storage
    localStorage.removeItem('audit_auth');
    localStorage.removeItem('audit_user');
    localStorage.removeItem('currentUser'); 
    
    // 2. Clear Server Cookie (CRITICAL FIX)
    document.cookie = "audit_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    
    // 3. Update UI and Redirect
    window.dispatchEvent(new Event('auth-change'));
    router.push("/login");
  };

  return (
    <aside 
      className={`${
        isCollapsed ? "w-20" : "w-64"
      } bg-slate-900 text-white flex flex-col h-screen sticky top-0 border-r border-slate-800 hidden md:flex transition-all duration-300 ease-in-out`}
    >
      {/* HEADER */}
      <div className={`p-6 flex items-center ${isCollapsed ? "justify-center" : "gap-3"} border-b border-slate-800 transition-all`}>
        <div className="bg-blue-600 p-2 rounded-lg flex-shrink-0">
          <Box size={24} className="text-white" />
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden whitespace-nowrap">
            <h1 className="font-black text-lg tracking-tight">JJCP THESIS</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">MENTORING HUB v4.0</p>
          </div>
        )}
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {!isCollapsed && <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Main Menu</p>}
        
        <SidebarItem collapsed={isCollapsed} icon={<LayoutDashboard size={20} />} label="Dashboard" href="/" active={pathname === "/"} />
        <SidebarItem collapsed={isCollapsed} icon={<Presentation size={20} />} label="Mock Defense" href="/mock-defense" active={pathname === "/mock-defense"} />
        
        <div className="pt-4 pb-2">
          <div className="h-px bg-slate-800 mx-4" />
        </div>
        
        {!isCollapsed && <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">System</p>}
        
        <SidebarItem collapsed={isCollapsed} icon={<Settings size={20} />} label="Settings" href="#" />
      </nav>

      {/* COLLAPSE TOGGLE */}
      <div className="px-4 pb-2">
         <button 
           onClick={() => setIsCollapsed(!isCollapsed)}
           className="w-full flex items-center justify-center p-2 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white transition-all"
         >
           {isCollapsed ? <ChevronRight size={20}/> : <ChevronLeft size={20}/>}
         </button>
      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-slate-800 flex flex-col gap-2">
        {currentUser && (
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-2"} mb-2 p-2 rounded-xl bg-slate-800/50 border border-slate-700/50`}>
             <div className="p-1.5 bg-blue-600 rounded-full flex-shrink-0">
                <User size={16} className="text-white" />
             </div>
             {!isCollapsed && (
               <div className="overflow-hidden">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Online</p>
                 <p className="text-xs font-bold text-white truncate max-w-[120px]" title={currentUser}>
                   {currentUser}
                 </p>
               </div>
             )}
          </div>
        )}

        <button 
          onClick={handleSignOut}
          className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"} text-slate-400 hover:text-white hover:bg-slate-800 w-full p-3 rounded-xl transition-all font-medium text-sm text-left group`}
        >
          <LogOut size={20} className="group-hover:text-red-400 transition-colors flex-shrink-0" />
          {!isCollapsed && <span className="group-hover:text-red-100 transition-colors overflow-hidden whitespace-nowrap">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

function SidebarItem({ icon, label, href, active = false, collapsed = false }: any) {
  return (
    <Link 
      href={href} 
      className={`flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-4"} py-3 rounded-xl transition-all font-medium text-sm ${
        active 
          ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      }`}
      title={collapsed ? label : ""}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}