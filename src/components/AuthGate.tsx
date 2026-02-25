"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

// 👇 Fixed Paths: Finding components in the SAME folder
import AppSidebar from "./AppSidebar";
import { SysAdminButton } from "./SysAdminButton";

import { 
  GraduationCap, Menu, X, ChevronLeft, ChevronRight, 
  ShieldCheck, Lock, ArrowRight, Loader2, AlertTriangle, Clock
} from 'lucide-react';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [isGlobalAuthenticated, setIsGlobalAuthenticated] = useState(false);
  const [gatePassword, setGatePassword] = useState("");
  const [gateError, setGateError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState("");

  const APP_PASSWORD = "jjcp1234"; 
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 0.1 * 60 * 1000; 

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const hasAccess = localStorage.getItem('app_access_granted');
    if (hasAccess === 'true') setIsGlobalAuthenticated(true);

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
      setIsGlobalAuthenticated(true);
      localStorage.setItem('app_access_granted', 'true');
      localStorage.removeItem('app_failed_attempts');
      localStorage.removeItem('app_lockout_until');
      setFailedAttempts(0);
      setGateError("");
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem('app_failed_attempts', newAttempts.toString());
      setGatePassword("");

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

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!isGlobalAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-4">
         {/* ... Your original login UI is simplified here for brevity, you can add your youtube iframe back if you want! ... */}
         <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-md text-center">
            <h1 className="text-3xl font-black text-slate-900 mb-2">Mentorship Hub</h1>
            <p className="text-slate-500 mb-8 font-medium">Restricted Access. Please verify your identity.</p>
            
            <form onSubmit={handleGateLogin} className="space-y-4">
              <input 
                type="password"
                placeholder="Enter Access Code"
                value={gatePassword}
                onChange={(e) => setGatePassword(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl outline-none transition-all font-bold text-center text-slate-700 text-lg"
                autoFocus
              />
              {gateError && <p className="text-red-500 text-xs font-bold animate-bounce">{gateError}</p>}
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 group">
                Enter Hub <ArrowRight size={18} />
              </button>
            </form>
         </div>
      </div>
    );
  }

  // --- THE MAIN APP ONCE LOGGED IN ---
  return (
    <div className="flex h-screen w-full flex-col md:flex-row">
      <AppSidebar />
      <main className="flex-1 h-screen overflow-y-auto bg-slate-50 p-4 md:p-8 relative pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {children}
        <SysAdminButton /> 
      </main>
    </div>
  );
}