"use client";
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import "./globals.css"; 
import { 
  Users, Calendar, LayoutDashboard, ChevronLeft, ChevronRight, GraduationCap, 
  Medal, List, CheckSquare, Menu, X, 
  FileText, Presentation, ShieldCheck, Lock, ArrowRight, Loader2, AlertTriangle, Clock
} from 'lucide-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // --- GLOBAL GATEKEEPER STATE ---
  const [isGlobalAuthenticated, setIsGlobalAuthenticated] = useState(false);
  const [gatePassword, setGatePassword] = useState("");
  const [gateError, setGateError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // --- RATE LIMITING STATE ---
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState("");

  // 🔐 CONFIG
  const APP_PASSWORD = "jjcp1234"; 
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 0.1 * 60 * 1000; 

  // --- LAYOUT STATE ---
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  // --- HELPER: LOGGING FUNCTION ---
  const logAccessAttempt = async (status: 'SUCCESS' | 'FAILED', count: number) => {
    try {
      // Send data to our new API route
      await fetch('/api/log-gate-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status, 
          attemptCount: count 
        }),
      });
    } catch (err) {
      console.error("Failed to log access attempt", err);
    }
  };

  // --- 1. CHECK AUTH & LOCKOUT ON LOAD ---
  useEffect(() => {
    const hasAccess = localStorage.getItem('app_access_granted');
    if (hasAccess === 'true') {
      setIsGlobalAuthenticated(true);
    }

    const storedAttempts = localStorage.getItem('app_failed_attempts');
    const storedLockout = localStorage.getItem('app_lockout_until');

    if (storedAttempts) setFailedAttempts(parseInt(storedAttempts));
    
    if (storedLockout) {
      const lockoutTime = parseInt(storedLockout);
      if (lockoutTime > Date.now()) {
        setLockoutUntil(lockoutTime);
        setGateError("System locked due to too many failed attempts.");
      } else {
        localStorage.removeItem('app_failed_attempts');
        localStorage.removeItem('app_lockout_until');
        setFailedAttempts(0);
      }
    }
    
    setIsLoading(false);
  }, []);

  // --- 2. COUNTDOWN TIMER ---
  useEffect(() => {
    if (!lockoutUntil) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = lockoutUntil - now;

      if (diff <= 0) {
        setLockoutUntil(null);
        setFailedAttempts(0);
        localStorage.removeItem('app_failed_attempts');
        localStorage.removeItem('app_lockout_until');
        setGateError("");
        clearInterval(timer);
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutUntil]);

  const handleGateLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutUntil) return;

    if (gatePassword === APP_PASSWORD) {
      // ✅ SUCCESS
      setIsGlobalAuthenticated(true);
      localStorage.setItem('app_access_granted', 'true');
      
      // LOG SUCCESS
      logAccessAttempt('SUCCESS', failedAttempts);

      // RESET
      localStorage.removeItem('app_failed_attempts');
      localStorage.removeItem('app_lockout_until');
      setFailedAttempts(0);
      setGateError("");
    } else {
      // ❌ FAILURE
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem('app_failed_attempts', newAttempts.toString());
      setGatePassword("");

      // LOG FAILURE
      logAccessAttempt('FAILED', newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockUntil = Date.now() + LOCKOUT_DURATION;
        setLockoutUntil(lockUntil);
        localStorage.setItem('app_lockout_until', lockUntil.toString());
        setGateError("Too many failed attempts. Access locked.");
      } else {
        setGateError(`Incorrect access code. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
      }
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    //{ name: 'Schedule Parser', path: '/parser', icon: Calendar },
    //{ name: 'Thesis Groups', path: '/groups', icon: Users },
    //{ name: 'Deliverables', path: '/deliverables', icon: CheckSquare },
    { name: 'Mock Defense', path: '/mock-defense', icon: Presentation },
    //{ name: 'Files Repository', path: '/files', icon: FileText }, 
    //{ name: 'Leaderboards', path: '/leaderboards', icon: Medal },
    //{ name: 'Masterlist', path: '/masterlist', icon: List },
  ];

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>JJCP Mentorship Hub v3.0</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>

      <body 
        className="flex h-screen flex-col md:flex-row bg-background text-foreground antialiased overflow-hidden" 
        suppressHydrationWarning
      >
        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center bg-slate-50">
            <Loader2 className="animate-spin text-blue-600" size={40} />
          </div>

        ) : !isGlobalAuthenticated ? (
          
          <div className="flex h-full w-full items-center justify-center bg-slate-50 p-4">
             <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl shadow-blue-100 border border-slate-100 w-full max-w-md text-center animate-in fade-in zoom-in duration-500">
                
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg ${lockoutUntil ? 'bg-red-50 shadow-red-100' : 'bg-blue-600 shadow-blue-200'}`}>
                  {lockoutUntil ? (
                    <AlertTriangle className="text-red-500" size={40} />
                  ) : (
                    <GraduationCap className="text-white" size={40} />
                  )}
                </div>

                <h1 className="text-3xl font-black text-slate-900 mb-2">
                  {lockoutUntil ? "SECURITY ALERT" : "Mentorship Hub"}
                </h1>
                <p className="text-slate-500 mb-8 font-medium">
                  {lockoutUntil ? "Unauthorized access detected." : "Restricted Access. Please verify your identity."}
                </p>
                
                {lockoutUntil ? (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="rounded-2xl overflow-hidden shadow-lg border-4 border-red-100">
                      <iframe 
                        width="100%" 
                        height="200" 
                        src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&controls=0&modestbranding=1" 
                        title="Security Breach Protocol" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                        className="w-full aspect-video"
                      ></iframe>
                    </div>

                    <div className="bg-red-50 text-red-600 py-4 px-4 rounded-xl font-bold text-sm animate-pulse flex flex-col items-center justify-center gap-2 border border-red-100">
                      <div className="flex items-center gap-2 uppercase tracking-widest text-[10px]">
                         <Clock size={14} /> System Lockout Active
                      </div>
                      <div className="text-3xl font-black font-mono tracking-tighter">
                        {timeLeft}
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleGateLogin} className="space-y-4">
                    <div className="relative">
                      <input 
                        type="password"
                        placeholder="Enter Access Code"
                        value={gatePassword}
                        onChange={(e) => setGatePassword(e.target.value)}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl outline-none transition-all font-bold text-center text-slate-700 text-lg"
                        autoFocus
                      />
                    </div>

                    {gateError && <p className="text-red-500 text-xs font-bold animate-bounce">{gateError}</p>}
                    
                    <button 
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 group"
                    >
                      Enter Hub <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </form>
                )}

                <div className="mt-8 text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                  JJCP Internal System v3.0
                </div>
             </div>
          </div>

        ) : (

          // --- MAIN APP (Authenticated) ---
          <>
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

            {isMobileOpen && (
              <div 
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setIsMobileOpen(false)}
              />
            )}

            <aside 
              className={`
                fixed inset-y-0 left-0 z-50 h-full shadow-2xl transform transition-transform duration-300 ease-in-out
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
                md:relative md:translate-x-0 md:shadow-none md:flex md:flex-col
                ${isCollapsed ? 'md:w-20' : 'md:w-72'}
                w-72 
                w-[280px] bg-white border-r border-slate-200
              `}
            >
              <button 
                onClick={() => setIsMobileOpen(false)}
                className="absolute top-4 right-4 p-1 md:hidden text-slate-500 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>

              <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:block absolute -right-3 top-10 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 border border-slate-200 rounded-full p-1 shadow-md hover:bg-slate-50 transition-colors z-50 text-slate-500"
              >
                {isCollapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
              </button>

              <div className={`p-6 mb-4 flex items-center gap-4 ${isCollapsed ? 'md:justify-center' : ''}`}>
                <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-200">
                    <GraduationCap size={24} />
                </div>
                <div className={`${isCollapsed ? 'md:hidden' : 'block'} animate-in fade-in duration-300`}>
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 leading-none mb-1">JJCP Mentorship</h2>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">Hub v3.0</p>
                </div>
              </div>

              <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link 
                      key={item.path} 
                      href={item.path}
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center gap-4 px-6 py-4 rounded-xl transition-all font-bold text-base ${
          isActive 
            ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
                    >
                      <item.icon size={20} className="shrink-0" />
                      <span className={`${isCollapsed ? 'md:hidden' : 'block'} truncate`}>
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 mt-auto">
                <button 
                   onClick={() => {
                      localStorage.removeItem('app_access_granted');
                      setIsGlobalAuthenticated(false);
                   }}
                   className={`w-full flex items-center gap-2 text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                >
                   <Lock size={12} /> <span className={isCollapsed ? 'hidden' : 'block'}>Lock System</span>
                </button>
              </div>
            </aside>

            <main className="flex-1 h-full overflow-y-auto bg-background relative w-full">
              <div className="p-4 md:p-12 max-w-6xl mx-auto">
                {children}
              </div>
            </main>

            <DiscreetAuditLink />
          </>
        )}
      </body>
    </html>
  );
}

export function DiscreetAuditLink() {
  return (
    <div className="fixed bottom-3 right-3 z-50">
      <Link 
        href="/audittrail" 
        className="flex items-center gap-2 p-2 text-slate-300 opacity-5 hover:opacity-100 transition-all duration-500 hover:bg-slate-100 rounded-lg group"
        title="System Audit Trail"
      >
        <span className="text-[10px] font-mono font-bold tracking-widest hidden group-hover:block text-slate-500">
          SYS.ADMIN
        </span>
        <ShieldCheck size={14} />
      </Link>
    </div>
  );
}