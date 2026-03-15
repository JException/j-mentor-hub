"use client";

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import OnboardingModal from './OnboardingModal';
import AppSidebar from "./AppSidebar";
import { SysAdminButton } from "./SysAdminButton";

// Import your server actions for logging
import { recordAuditLog, setAuthCookie } from "../app/actions";

import { 
  ShieldCheck, ArrowRight, Loader2, AlertTriangle, Lock, Fingerprint
} from 'lucide-react';

// --- ReactBits: Decrypted Text Component ---
const DecryptedText = ({ text }: { text: string }) => {
  const [displayText, setDisplayText] = useState("");
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
  
  useEffect(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(prev => 
        text.split("").map((char, index) => {
          if (index < iteration) return text[index];
          return characters[Math.floor(Math.random() * characters.length)];
        }).join("")
      );
      iteration += 1/3;
      if (iteration >= text.length) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [text]);

  return <span className="font-mono tracking-widest">{displayText}</span>;
};

// --- Multi-User Keys (From your old login page) ---
const VAULT_KEYS: Record<string, string> = {
  "jjcp1234": "Sir Pura",         
  "mockdefense1": "Panelist",
  "wilempogi": "Wilem",
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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const pathname = usePathname();
  const cardRef = useRef<HTMLDivElement>(null);

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 1 * 60 * 1000; // 1 Minute

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  useEffect(() => {
    const hasAccess = localStorage.getItem('app_access_granted');
    const onboardingSeen = localStorage.getItem('onboarding_seen');
    
    if (hasAccess === 'true') {
      setIsGlobalAuthenticated(true);
      if (onboardingSeen !== 'true') setShowOnboarding(true);
    }

    const storedAttempts = localStorage.getItem('app_failed_attempts');
    const storedLockout = localStorage.getItem('app_lockout_until');
    if (storedAttempts) setFailedAttempts(parseInt(storedAttempts));
    
    if (storedLockout) {
      const lockoutTime = parseInt(storedLockout);
      if (lockoutTime > Date.now()) {
        setLockoutUntil(lockoutTime);
        setGateError("SECURITY LOCKDOWN ACTIVE");
      }
    }
    setTimeout(() => setIsLoading(false), 800);
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
      } else {
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutUntil]);

  const handleGateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutUntil) return;

    const input = gatePassword.trim();
    const matchedUser = VAULT_KEYS[input];

    if (matchedUser) {
      // ✅ SUCCESS
      setIsGlobalAuthenticated(true);
      localStorage.setItem('app_access_granted', 'true');
      localStorage.setItem('audit_user', matchedUser); // Compatibility with your old system
      
      await setAuthCookie(matchedUser); 
      await recordAuditLog("SYSTEM GATE", "LOGIN", `Access granted to ${matchedUser}`, null, matchedUser);

      if (localStorage.getItem('onboarding_seen') !== 'true') {
        setShowOnboarding(true);
      }
      
      localStorage.removeItem('app_failed_attempts');
      localStorage.removeItem('app_lockout_until');
    } else {
      // ❌ FAILURE
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem('app_failed_attempts', newAttempts.toString());
      setGatePassword("");

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockUntil = Date.now() + LOCKOUT_DURATION;
        setLockoutUntil(lockUntil);
        localStorage.setItem('app_lockout_until', lockUntil.toString());
        setGateError("MAX ATTEMPTS EXCEEDED. LOCKDOWN.");
      } else {
        setGateError(`INVALID KEYCODE. ${MAX_ATTEMPTS - newAttempts} REMAINING.`);
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
        <Loader2 className="text-indigo-500 animate-spin" size={40} />
      </div>
    );
  }

  if (!isGlobalAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#060B19] p-4 relative overflow-hidden" onMouseMove={handleMouseMove}>
        
        {/* Matrix Background */}
        <div className="absolute inset-0 z-0 overflow-hidden flex justify-around opacity-10 pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="writing-vertical text-[10px] text-indigo-500 font-mono animate-matrix-rain" style={{ animationDuration: `${10+i}s` }}>
              {"01101011010".repeat(20)}
            </div>
          ))}
        </div>

        <motion.div 
          ref={cardRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-[#0c142b]/80 backdrop-blur-3xl p-10 rounded-[48px] shadow-2xl border border-white/5 w-full max-w-md text-center space-y-8 overflow-hidden group"
        >
          {/* ReactBits Spotlight */}
          <div 
            className="pointer-events-none absolute -inset-px transition duration-300 opacity-0 group-hover:opacity-100"
            style={{ background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.1), transparent 40%)` }}
          />

          <div className="relative z-10 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              {lockoutUntil ? <AlertTriangle className="text-rose-500" /> : <Fingerprint className="text-indigo-400" />}
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter italic uppercase">
              Mentorship <span className="text-indigo-500">Hub</span>
            </h1>
            <div className="text-[10px] text-indigo-400/50 font-bold tracking-[0.3em] h-4">
              <DecryptedText text={lockoutUntil ? "SYSTEM HALTED" : "ENCRYPTED GATEWAY"} />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {lockoutUntil ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 bg-rose-500/5 border border-rose-500/10 rounded-3xl">
                <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest">Cooldown Active</p>
                <p className="text-white font-mono text-2xl mt-2">{timeLeft}</p>
              </motion.div>
            ) : (
              <form onSubmit={handleGateLogin} className="space-y-4 relative z-10">
                <input 
                  type="password"
                  placeholder="ENTER ACCESS KEY"
                  value={gatePassword}
                  onChange={(e) => setGatePassword(e.target.value)}
                  className="w-full px-6 py-5 bg-black/20 border border-white/5 focus:border-indigo-500/50 rounded-2xl outline-none text-center font-mono text-indigo-400 text-xl tracking-[0.3em] transition-all"
                  autoFocus
                />
                {gateError && <p className="text-rose-500 text-[9px] font-bold uppercase animate-pulse">{gateError}</p>}
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 group">
                  Authorize <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            )}
          </AnimatePresence>
          
          <p className="text-[8px] text-slate-600 font-bold tracking-widest uppercase pt-4 border-t border-white/5 relative z-10">
            Secure Terminal // Node: {pathname}
          </p>
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