"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import OnboardingModal from './OnboardingModal';
import AppSidebar from "./AppSidebar";
import { SysAdminButton } from "./SysAdminButton";

import { 
  GraduationCap, ShieldCheck, ArrowRight, Loader2, AlertTriangle, Clock, Lock
} from 'lucide-react';

// --- Typewriter Effect Component ---
const TypewriterText = ({ text }: { text: string }) => {
  const [displayText, setDisplayText] = useState("");
  
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setDisplayText(text.substring(0, i));
      i++;
      if (i > text.length) clearInterval(timer);
    }, 50) ;
    return () => clearInterval(timer);
  }, [text]);

  return <span className="font-mono">{displayText}<span className="animate-pulse">_</span></span>;
};

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [isGlobalAuthenticated, setIsGlobalAuthenticated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [gatePassword, setGatePassword] = useState("");
  const [gateError, setGateError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState("");

  const pathname = usePathname(); // <--- ADD THIS LINE HERE 🚀

  const APP_PASSWORD = "jjcp1234"; 
  // ... rest of your code
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 0.1 * 60 * 1000; 

  useEffect(() => {
    const hasAccess = localStorage.getItem('app_access_granted');
    const onboardingSeen = localStorage.getItem('onboarding_seen');
    
    if (hasAccess === 'true') setIsGlobalAuthenticated(true);
    if (hasAccess === 'true' && onboardingSeen !== 'true') {
        setShowOnboarding(true);
    }

    const storedAttempts = localStorage.getItem('app_failed_attempts');
    const storedLockout = localStorage.getItem('app_lockout_until');

    if (storedAttempts) setFailedAttempts(parseInt(storedAttempts));
    
    if (storedLockout) {
      const lockoutTime = parseInt(storedLockout);
      if (lockoutTime > Date.now()) {
        setLockoutUntil(lockoutTime);
        setGateError("SECURITY LOCKDOWN: UNKNOWN ENTITY DETECTED.");
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
      const onboardingSeen = localStorage.getItem('onboarding_seen');
      if (onboardingSeen !== 'true') {
        setShowOnboarding(true);
      }
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
        setGateError("SECURITY LOCKDOWN: ACCESS DENIED.");
      } else {
        setGateError(`INVALID CREDENTIALS. ${MAX_ATTEMPTS - newAttempts} ATTEMPTS REMAINING.`);
      }
    }
  };

  const closeOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('onboarding_seen', 'true');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#060B19]">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Loader2 className="text-indigo-500" size={40} />
        </motion.div>
      </div>
    );
  }

  if (!isGlobalAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#060B19] p-4 relative overflow-hidden">
        {/* ReactBits Style Background Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-[#0c142b]/80 backdrop-blur-xl p-10 rounded-[40px] shadow-2xl border border-white/5 w-full max-w-md text-center space-y-8"
        >
          {/* Header */}
          <div className="space-y-4">
            <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-colors duration-500 ${lockoutUntil ? 'border-rose-500 bg-rose-500/10' : 'border-indigo-500/30 bg-indigo-500/10'}`}>
              {lockoutUntil ? <AlertTriangle className="text-rose-500" /> : <ShieldCheck className="text-indigo-400" />}
            </div>
            
            <div>
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">
                Mentorship <span className="text-indigo-500">Hub</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-bold tracking-[0.3em] uppercase mt-2 h-4">
                <TypewriterText text={lockoutUntil ? "System Integrity Compromised" : "Authentication Required"} />
              </p>
            </div>
          </div>

          {lockoutUntil ? (
            <div className="py-6 space-y-4">
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                <p className="text-rose-500 text-xs font-bold uppercase tracking-widest">Lockout Active</p>
                <p className="text-white font-mono text-xl mt-2">{timeLeft}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleGateLogin} className="space-y-6">
              <div className="relative group">
                <input 
                  type="password"
                  placeholder="••••••••"
                  value={gatePassword}
                  onChange={(e) => setGatePassword(e.target.value)}
                  className="w-full px-6 py-5 bg-[#060B19] border border-slate-800 focus:border-indigo-500/50 rounded-2xl outline-none transition-all font-mono text-center text-indigo-400 text-2xl tracking-[0.3em] placeholder:text-slate-800"
                  autoFocus
                />
                {/* Visual Accent */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-indigo-500 transition-all duration-500 group-focus-within:w-1/2" />
              </div>

              {gateError && (
                <motion.p 
                  initial={{ x: -10 }} animate={{ x: 0 }}
                  className="text-rose-500 text-[10px] font-black uppercase tracking-widest"
                >
                  {gateError}
                </motion.p>
              )}

              <button 
                type="submit" 
                className="group relative w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 overflow-hidden"
              >
                <span className="text-xs uppercase tracking-[0.2em] relative z-10">Authorize Access</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform relative z-10" />
                
                {/* ReactBits Hover Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
              </button>
            </form>
          )}

          <div className="pt-4 flex justify-center gap-4 border-t border-slate-800/50">
            <span className="text-[8px] text-slate-700 font-bold uppercase tracking-widest">Protocol: AES-256</span>
            <span className="text-[8px] text-slate-700 font-bold uppercase tracking-widest">Node: {pathname}</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#060B19]">
      <AppSidebar />
      <OnboardingModal isOpen={showOnboarding} onClose={closeOnboarding} />
      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden nebula-scrollbar relative">
        {children}
        <SysAdminButton /> 
      </main>
    </div>
  );
}