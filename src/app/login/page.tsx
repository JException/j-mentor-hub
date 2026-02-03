"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Merged imports for both Login and Animation
import { 
  ShieldAlert, 
  ArrowRight, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Lock, 
  Fingerprint 
} from 'lucide-react';
import { recordAuditLog, setAuthCookie } from "../actions"; 

// --- CONSTANTS ---
const VAULT_KEYS: Record<string, string> = {
  "jjcp1234": "Sir Pura",         
  "abra": "ABRA",                  
  "agile123": "Agile Team",
  "swinescan": "Swine Scan Team",
  "mockdefense": "Panelist",
  "alpha": "Alpha",
  "wilem": "Wilem",
  "cyra": "Cyra",
  "akira": "Akira",
}; 

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 1 * 60 * 1000; // 1 Minute

export default function LoginPage() {
  const router = useRouter();
  
  // --- LOGIN STATE ---
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0); 
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [isRickrolled, setIsRickrolled] = useState(false); 

  // --- ANIMATION STATE ---
  const [introStage, setIntroStage] = useState(0);
  const [showIntro, setShowIntro] = useState(true);

  // ---------------------------------------------------------
  // 1. INTRO ANIMATION LOGIC
  // ---------------------------------------------------------
  useEffect(() => {
    // Check if we've already shown the intro in this session
    const hasSeenIntro = sessionStorage.getItem("hasSeenIntro");
    
    if (hasSeenIntro) {
      setShowIntro(false); // Skip immediately if already seen
      return;
    }

    // Play the animation sequence if not seen
    const timers = [
      setTimeout(() => setIntroStage(1), 800),  // "Verifying"
      setTimeout(() => setIntroStage(2), 2000), // "Access Granted"
      setTimeout(() => {
        setShowIntro(false);
        sessionStorage.setItem("hasSeenIntro", "true"); // Mark as seen
      }, 3200) // Slide away / Finish
    ];

    return () => timers.forEach(clearTimeout);
  }, []);


  // ---------------------------------------------------------
  // 2. LOGIN & AUTH LOGIC
  // ---------------------------------------------------------
  useEffect(() => {
    // Clear everything on load
    localStorage.removeItem('audit_auth');
    localStorage.removeItem('audit_user');
    localStorage.removeItem('vault_auth'); 
    localStorage.removeItem('vault_user');
    
    // Clear the server cookie to ensure a fresh start
    document.cookie = "audit_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    
    if (localStorage.getItem('audit_auth') === 'true') {
      router.push('/');
    }

    const storedLockout = localStorage.getItem('audit_lockout_until');
    if (storedLockout) {
      const lockoutTime = parseInt(storedLockout);
      if (lockoutTime > Date.now()) {
        setLockoutUntil(lockoutTime);
        setError("Account locked.");
      } else {
        localStorage.removeItem('audit_lockout_until');
      }
    }
  }, [router]);

  // Timer for Lockout
  useEffect(() => {
    if (!lockoutUntil) return;
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = lockoutUntil - now;
      if (diff <= 0) {
        setLockoutUntil(null);
        setFailedAttempts(0);
        localStorage.removeItem('audit_lockout_until');
        setError("");
      } else {
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutUntil]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutUntil) return;

    const input = password.trim();
    const matchedUser = VAULT_KEYS[input];

    if (matchedUser) {
      // ✅ SUCCESS PATH
      localStorage.setItem('audit_auth', 'true');
      localStorage.setItem('audit_user', matchedUser);
      await setAuthCookie(matchedUser); 

      await recordAuditLog(
        "SYSTEM GATEKEEPER", 
        "LOGIN", 
        `Authorized access granted to ${matchedUser}`, 
        null, 
        matchedUser
      );

      window.dispatchEvent(new Event('auth-change'));
      router.push('/');
    } else {
      // ❌ FAILURE PATH
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      setPassword("");

      await recordAuditLog(
        "SYSTEM GATEKEEPER", 
        "LOGIN_FAIL", 
        `Failed login attempt with key: ${input}`, 
        { attempts: newAttempts }, 
        "Guest"
      );

      if (newAttempts >= MAX_ATTEMPTS) {
         setIsRickrolled(true); 
         const lockoutTime = Date.now() + LOCKOUT_DURATION;
         setLockoutUntil(lockoutTime);
         localStorage.setItem('audit_lockout_until', lockoutTime.toString());
      } else {
        setError("Access Denied: Invalid Key");
      }
    }
  };

  // ---------------------------------------------------------
  // 3. RENDER
  // ---------------------------------------------------------

  return (
    <>
      {/* --- LAYER 1: INTRO ANIMATION (Fixed Overlay) --- */}
      {showIntro && (
        <div className={`fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center transition-transform duration-700 ease-in-out ${introStage === 3 ? '-translate-y-full' : 'translate-y-0'}`}>
          
          {/* BACKGROUND GRID EFFECT */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

          {/* STAGE 0: INITIALIZING */}
          {introStage === 0 && (
            <div className="animate-pulse flex flex-col items-center">
              <Lock className="w-16 h-16 text-slate-500 mb-4" />
              <h2 className="text-slate-400 font-mono text-xl tracking-widest">Pre-loading interface components...</h2>
            </div>
          )}

          {/* STAGE 1: VERIFYING */}
          {introStage === 1 && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <Fingerprint className="w-16 h-16 text-blue-500 mb-4 animate-bounce" />
              <h2 className="text-blue-400 font-mono text-xl tracking-widest">Verifying SSL certificates...</h2>
              <div className="w-48 h-1 bg-slate-800 rounded mt-4 overflow-hidden">
                <div className="h-full bg-blue-500 animate-[loading_1s_ease-in-out_infinite]" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {/* STAGE 2: ACCESS GRANTED */}
          {introStage === 2 && (
            <div className="flex flex-col items-center animate-in zoom-in-100 duration-5000">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500 blur-xl opacity-20 animate-pulse" />
                <ShieldCheck className="relative w-20 h-20 text-green-400 mb-4" />
              </div>
              <h2 className="text-green-400 font-black text-2xl tracking-[0.2em] animate-pulse">Authorized!</h2>
              <p className="text-slate-500 font-mono text-sm mt-2">Welcome to Thesis Mentoring Hub 4.0</p>
            </div>
          )}
        </div>
      )}

      {/* --- LAYER 2: RICKROLL TRAP (Overlay) --- */}
      {isRickrolled && (
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center w-screen h-screen">
          <button 
                onClick={() => setIsRickrolled(false)} 
                className="absolute top-10 right-10 z-[10000] bg-white/20 hover:bg-white/40 text-white rounded-full px-6 py-3 backdrop-blur-md transition-all font-bold border border-white/50 shadow-2xl"
          >
                I ADMIT DEFEAT (CLOSE)
          </button>
          <iframe 
              className="w-full h-full"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=0&playsinline=1&controls=0&modestbranding=1&loop=1&playlist=dQw4w9WgXcQ" 
              title="Security Protocol" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              allowFullScreen
          />
        </div>
      )}

      {/* --- LAYER 3: LOGIN FORM (Underneath) --- */}
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md text-center border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
          
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-800 shadow-inner border border-slate-100">
            {lockoutUntil ? <AlertTriangle className="text-red-500" size={32} /> : <ShieldAlert size={32} className="text-blue-600"/>}
          </div>
          
          <h2 className="text-2xl font-black text-slate-900 mb-2">Restricted Access</h2>
          <p className="text-[10px] text-slate-400 font-black tracking-[0.2em] uppercase mb-8">Authentication Required</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password"
              placeholder={lockoutUntil ? "SYSTEM LOCKED" : "Enter Master Key"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!!lockoutUntil}
              className="w-full px-6 py-4 border-2 rounded-2xl text-center font-bold text-slate-800 bg-slate-50 outline-none focus:border-blue-200 focus:bg-white transition-all placeholder:text-slate-300 disabled:opacity-50"
            />
            
            {lockoutUntil ? (
              <div className="text-red-500 font-bold text-sm bg-red-50 py-3 rounded-xl border border-red-100 animate-pulse">
                <Clock className="inline w-4 h-4 mr-1"/> Lockout Active: {timeLeft}
              </div>
            ) : (
              error && (
                  <div className="bg-red-50 py-3 rounded-xl border border-red-100">
                      <p className="text-red-500 text-sm font-bold animate-bounce mb-1">{error}</p>
                      <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                          Attempts Remaining: {MAX_ATTEMPTS - failedAttempts}
                      </p>
                  </div>
              )
            )}

            <button 
              type="submit" 
              disabled={!!lockoutUntil}
              className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enter System <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
            </button>
          </form>
          <p className="mt-6 text-[10px] text-slate-300 uppercase tracking-wider font-bold">JJCP Thesis Mentoring Hub 4.0</p>
        </div>
      </div>
    </>
  );
}