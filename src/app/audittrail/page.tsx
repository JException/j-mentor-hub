"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuditLogs, clearAuditLogs } from "@/app/actions"; 
import { Search, History, Loader2, ArrowRight, AlertTriangle, Clock, Filter, ShieldAlert } from 'lucide-react';

// ✅ UPDATED: Added distinct colors for Mock Defense, Groups, etc.
const getModuleBadgeStyle = (moduleName: string) => {
  const normalized = moduleName?.toUpperCase() || "UNKNOWN";
  
  if (normalized.includes("SYSTEM") || normalized.includes("GATEKEEPER")) 
    return "bg-red-50 text-red-600 border-red-100";
    
  if (normalized.includes("GROUPS")) 
    return "bg-indigo-50 text-indigo-600 border-indigo-100"; 
    
  if (normalized.includes("MOCK") || normalized.includes("DEFENSE")) 
    return "bg-amber-50 text-amber-600 border-amber-100"; 
    
  if (normalized.includes("FILE") || normalized.includes("REPOSITORY")) 
    return "bg-emerald-50 text-emerald-600 border-emerald-100"; 
    
  return "bg-slate-100 text-slate-500 border-slate-200"; 
};

// 🔒 SINGLE MASTER KEY CONFIGURATION
const MASTER_KEY = "jjcp5211997";
const ADMIN_NAME = "Justine Jude Pura (Admin)";

export default function AuditTrailPage() {
  const router = useRouter(); 
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("All");
  
  // State for The Trap
  const [isRickrolled, setIsRickrolled] = useState(false);
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(""); 
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(""); 

  // --- INITIAL LOAD ---
  useEffect(() => {
    // 1. CHECK MAIN SYSTEM AUTH FIRST (sys_auth)
    const systemAuth = localStorage.getItem('sys_auth');
    if (systemAuth !== 'true') {
        router.push('/login'); 
        return;
    }

    // 2. CHECK VAULT SPECIFIC AUTH (vault_auth)
    const authStatus = localStorage.getItem('vault_auth');
    const storedUser = localStorage.getItem('vault_user');

    if (authStatus === 'true') {
      setIsAuthenticated(true);
      setCurrentUser(storedUser || ADMIN_NAME);
      fetchLogs();
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

  // --- TIMER ---
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

  // --- LOGGING ---
  const logAction = async (userNameOverride: string, status: string, desc: string) => {
    try {
        await fetch('/api/log-gate-attempt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                module: "SYSTEM GATEKEEPER", 
                user: userNameOverride, 
                description: desc, 
                status: status 
            }),
        });
    } catch (err) { console.error("Log failed", err); }
  };

  // --- LOGIN HANDLER ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = password.trim(); 
    
    // 1. CHECK LOCKOUT
    if (lockoutUntil) return;

    // 2. CHECK SINGLE PASSWORD
    if (input === MASTER_KEY) {
      // ✅ SUCCESS
      setIsAuthenticated(true);
      setCurrentUser(ADMIN_NAME); 
      
      localStorage.setItem('vault_auth', 'true');
      localStorage.setItem('vault_user', ADMIN_NAME); 
      
      setFailedAttempts(0);
      setError("");
      
      // LOG SUCCESS
      await logAction(ADMIN_NAME, "SUCCESS", `Authorized access granted to ${ADMIN_NAME}.`);
      
      fetchLogs();
    } else {
      // ❌ FAILURE
      setIsRickrolled(true);
      setPassword("");
      logAction("Guest", "TRAPPED", `Trap Protocol triggered. Invalid code: ${input}`);
    }
  };

  // --- LOGOUT HANDLER ---
  const handleLogout = () => {
      localStorage.removeItem('vault_auth');
      localStorage.removeItem('vault_user');
      window.location.reload();
  };

  const fetchLogs = async () => {
    setLoading(true);
    const data = await getAuditLogs();
    setLogs(data);
    setLoading(false);
  };

  if (isRickrolled) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center w-screen h-screen">
        <button 
              onClick={() => { setIsRickrolled(false); setPassword(""); setError(""); }} 
              className="absolute top-10 right-10 z-[10000] bg-white/20 hover:bg-white/40 text-white rounded-full px-6 py-3 backdrop-blur-md transition-all font-bold border border-white/50 shadow-2xl"
        >
              CLOSE TRAP
        </button>
        <iframe 
            className="w-full h-full"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&playsinline=1&controls=0&modestbranding=1&loop=1&playlist=dQw4w9WgXcQ" 
            title="Security Protocol" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowFullScreen
        />
      </div>
    );
  }

  // ==========================================================
  // 🔒 LOGIN SCREEN
  // ==========================================================
  if (!isAuthenticated) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md text-center border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
          
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-800 shadow-inner border border-slate-100">
             {lockoutUntil ? <AlertTriangle className="text-red-500" size={32} /> : <ShieldAlert size={32} className="text-blue-600"/>}
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Restricted Vault</h2>
          <p className="text-[10px] text-slate-400 font-black tracking-[0.2em] uppercase mb-8">Master Key Required</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password"
              placeholder={lockoutUntil ? "SYSTEM LOCKED" : "Enter Master Key"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 border-2 rounded-2xl text-center font-bold text-slate-800 bg-slate-50 outline-none focus:border-blue-200 focus:bg-white transition-all placeholder:text-slate-300"
            />
            {lockoutUntil ? (
              <div className="text-red-500 font-bold text-sm bg-red-50 py-3 rounded-xl border border-red-100">
                <Clock className="inline w-4 h-4 mr-1"/> Lockout Active: {timeLeft}
              </div>
            ) : (
              error && <p className="text-red-500 text-sm font-bold animate-bounce bg-red-50 py-2 rounded-lg">{error}</p>
            )}

            <button 
              type="submit" 
              className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 group"
            >
              Verify Identity <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
            </button>
          </form>
          <p className="mt-6 text-[10px] text-slate-300 uppercase tracking-wider font-bold">JJCP Internal System v3.0</p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // 📊 DASHBOARD
  // ==========================================================
  
  const uniqueModules = Array.from(new Set(logs.map(log => log.module || "Unknown"))).sort();

  const filteredLogs = logs.filter((log: any) => {
    const desc = (log?.description || "").toLowerCase();
    const user = (log?.user || "").toLowerCase();
    const mod = log?.module || "Unknown";
    const searchLower = search.toLowerCase();

    const matchesSearch = desc.includes(searchLower) || user.includes(searchLower) || (log?.ipAddress || "").includes(searchLower);
    const matchesModule = filterModule === "All" || mod === filterModule;

    return matchesSearch && matchesModule;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
               <History size={24} /> 
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
               Audit Trail
            </h1>
          </div>
          <p className="text-slate-500 font-medium text-sm ml-1">
            Access granted to <span className="text-blue-600 font-black uppercase">{currentUser}</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
             <button onClick={async () => { await clearAuditLogs(); window.location.reload(); }} className="px-4 py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 font-bold text-xs uppercase tracking-widest transition-colors">
               Clear All Logs
             </button>
             <button onClick={handleLogout} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold text-xs uppercase tracking-widest transition-colors">
               Lock Vault
             </button>
        </div>
      </header>

      {/* CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-2 rounded-[2rem] shadow-sm border border-slate-200/60">
        <div className="md:col-span-2 relative">
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
           <input 
             className="w-full pl-14 pr-4 py-4 bg-slate-50 hover:bg-slate-100 focus:bg-white border-2 border-transparent focus:border-blue-100 rounded-[1.5rem] outline-none font-semibold text-slate-700 transition-all placeholder:text-slate-400" 
             placeholder="Search logs..." 
             value={search} 
             onChange={e => setSearch(e.target.value)} 
           />
        </div>
        <div className="relative">
          <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <select 
            className="w-full pl-14 pr-6 py-4 bg-slate-50 hover:bg-slate-100 focus:bg-white border-2 border-transparent focus:border-blue-100 rounded-[1.5rem] font-bold text-slate-600 outline-none appearance-none cursor-pointer transition-all" 
            value={filterModule} 
            onChange={e => setFilterModule(e.target.value)}
          >
            <option value="All">All Modules</option>
            {uniqueModules.map(mod => (
              <option key={mod} value={mod}>{mod}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest w-16">#</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest w-48">Module</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest w-40">User / IP</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Description</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest w-48 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                 <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500 mb-2"/></td></tr> 
              ) : filteredLogs.length === 0 ? (
                 <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold">No logs found.</td></tr>
              ) : (
                filteredLogs.map((log, i) => {
                  
                  // ✅ NAME FIX LOGIC:
                  // This fixes "Guest" only if the description explicitly says "Authorized access granted to..."
                  // For other actions (like delete grade), the log comes from the DB as "Guest" if the backend didn't receive the name.
                  let userDisplay = log.user || "Guest";
                  
                  if (userDisplay === "Guest" && log.description?.includes("Authorized access granted to")) {
                    const parts = log.description.split("to ");
                    if (parts[1]) {
                      userDisplay = parts[1].replace(".", "").trim();
                    }
                  }

                  // Color coding for specific users
                  const isAbra = userDisplay === "ABRA";
                  const isJJP = userDisplay.includes("Justine") || userDisplay.includes("Admin");
                  const isAgile = userDisplay === "Agile";
                  const isPanel = userDisplay === "Panelists";
                  const isSwine = userDisplay.includes("Swine"); // 👈 Retained this

                  return (
                    <tr key={log._id || i} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="p-6 text-slate-300 font-mono text-xs font-bold">{filteredLogs.length - i}</td>
                      <td className="p-6">
                        <span className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase border tracking-wider shadow-sm whitespace-nowrap ${getModuleBadgeStyle(log.module)}`}>
                          {log.module}
                        </span>
                      </td>
                      <td className="p-6">
                          <div className="flex flex-col">
                              <span className={`font-bold text-xs ${
                                isAbra ? 'text-purple-600' : 
                                isJJP ? 'text-blue-600' : 
                                isAgile ? 'text-green-600' :
                                isPanel ? 'text-orange-600' :
                                isSwine ? 'text-pink-600' : 
                                'text-slate-500'
                              }`}>
                                {userDisplay}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">{log.ipAddress || "::1"}</span>
                          </div>
                      </td>
                      <td className="p-6">
                          <p className="font-medium text-slate-600 text-sm leading-relaxed">
                              {log.description}
                          </p>
                      </td>
                      <td className="p-6 text-right">
                          <div className="flex flex-col items-end">
                              <span className="text-xs font-bold text-slate-500">
                                  {new Date(log.createdAt || log.timestamp).toLocaleDateString()}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                  {new Date(log.createdAt || log.timestamp).toLocaleTimeString()}
                              </span>
                          </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}