"use client";
import React, { useState, useEffect } from 'react';
import { Search, History, Loader2, Lock, ShieldCheck, ArrowRight, AlertTriangle, Clock } from 'lucide-react';
import { getAuditLogs, clearAuditLogs } from "@/app/actions";

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("All");
  
  // --- PASSWORD PROTECTION STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  // --- RATE LIMITING STATE ---
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(""); 

  const ADMIN_PASSWORD = "11groups"; 
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 15 * 60 * 1000; 

  // 1. Initial Load: Check Auth & Lockout Status
  useEffect(() => {
    // Check Auth
    const authStatus = localStorage.getItem('audit_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      fetchLogs();
    }

    // Check Lockout
    const storedAttempts = localStorage.getItem('audit_failed_attempts');
    const storedLockout = localStorage.getItem('audit_lockout_until');

    if (storedAttempts) setFailedAttempts(parseInt(storedAttempts));
    
    if (storedLockout) {
      const lockoutTime = parseInt(storedLockout);
      if (lockoutTime > Date.now()) {
        setLockoutUntil(lockoutTime);
        setError("Account locked due to too many failed attempts.");
      } else {
        localStorage.removeItem('audit_failed_attempts');
        localStorage.removeItem('audit_lockout_until');
        setFailedAttempts(0);
      }
    }
  }, []);

  // 2. Countdown Timer Effect
  useEffect(() => {
    if (!lockoutUntil) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = lockoutUntil - now;

      if (diff <= 0) {
        setLockoutUntil(null);
        setFailedAttempts(0);
        localStorage.removeItem('audit_failed_attempts');
        localStorage.removeItem('audit_lockout_until');
        setError("");
        clearInterval(timer);
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutUntil]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutUntil) return;

    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('audit_auth', 'true');
      
      localStorage.removeItem('audit_failed_attempts');
      localStorage.removeItem('audit_lockout_until');
      setFailedAttempts(0);
      setError("");
      
      fetchLogs();
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem('audit_failed_attempts', newAttempts.toString());
      setPassword(""); 

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockUntil = Date.now() + LOCKOUT_DURATION;
        setLockoutUntil(lockUntil);
        localStorage.setItem('audit_lockout_until', lockUntil.toString());
        setError("Too many failed attempts. Access locked.");
      } else {
        setError(`Incorrect password. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
      }
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    // Make sure this action returns ALL logs, sorted by newest
    const data = await getAuditLogs();
    setLogs(data);
    setLoading(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="h-[70vh] flex items-center justify-center animate-in fade-in zoom-in duration-500">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl shadow-blue-100 border border-slate-100 w-full max-w-md text-center">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${lockoutUntil ? 'bg-red-50' : 'bg-blue-50'}`}>
            {lockoutUntil ? <AlertTriangle className="text-red-500" size={32} /> : <Lock className="text-blue-600" size={32} />}
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">
            {lockoutUntil ? "System Locked" : "Restricted Access"}
          </h2>
          <p className="text-slate-500 mb-8 font-medium">
            {lockoutUntil ? `Please wait before trying again.` : "Please enter the administrator password to view the security audit logs."}
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input 
                type="password"
                placeholder={lockoutUntil ? "Locked" : "Enter Password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!!lockoutUntil}
                className={`w-full px-6 py-4 border-2 rounded-2xl outline-none transition-all font-bold text-center text-slate-700
                  ${lockoutUntil ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-50' : 'bg-slate-50 border-transparent focus:border-blue-500/20 focus:bg-white'}`}
                autoFocus={!lockoutUntil}
              />
            </div>
            {lockoutUntil ? (
              <div className="bg-red-50 text-red-600 py-3 px-4 rounded-xl font-bold text-sm animate-pulse flex items-center justify-center gap-2">
                 <Clock size={16} /> Try again in: {timeLeft}
              </div>
            ) : (
              error && <p className="text-red-500 text-xs font-bold animate-bounce">{error}</p>
            )}
            <button 
              type="submit"
              disabled={!!lockoutUntil}
              className={`w-full font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 group
                ${lockoutUntil ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'}`}
            >
              {lockoutUntil ? "Access Denied" : "Verify Identity"} 
              {!lockoutUntil && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>
          <p className="mt-8 text-[10px] text-slate-400 uppercase tracking-widest font-black flex items-center justify-center gap-2">
            <ShieldCheck size={12} /> Secure Audit System v3.1
          </p>
        </div>
      </div>
    );
  }

  // --- FILTER LOGIC ---
  const filteredLogs = logs.filter((log: any) => {
    // FIX: Check BOTH 'description' (old logs) and 'details' (new security logs)
    const description = (log?.description || log?.details || "").toLowerCase();
    const ipAddress = (log?.ipAddress || "").toLowerCase();
    const module = log?.module ?? "Unknown";
    const searchTerm = search.toLowerCase();
    
    const matchesSearch = description.includes(searchTerm) || ipAddress.includes(searchTerm);
    const matchesModule = filterModule === "All" || module === filterModule;
    
    return matchesSearch && matchesModule;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <History className="text-blue-600" size={36} /> Audit Trail
          </h1>
          <p className="text-slate-500 font-medium mt-1">Authorized View: Monitoring system modifications.</p>
        </div>
        <div className="flex items-center gap-4">
            <button 
                onClick={async () => {
                    if(confirm("Are you sure you want to clear all logs? This cannot be undone.")) {
                        await clearAuditLogs(); 
                        window.location.reload();
                    }
                }}
                className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600"
            >
            Clear Logs
            </button>
            <button 
            onClick={() => {
                localStorage.removeItem('audit_auth');
                window.location.reload();
            }}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-500 transition-colors"
            >
            Logout Session
            </button>
        </div>
      </header>

      {/* FILTER BOX */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-200/60">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 ring-blue-500/20 transition-all font-medium text-slate-600"
            placeholder="Search logs or IPs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="bg-slate-50 border-none px-6 py-3 rounded-2xl outline-none font-bold text-slate-600 cursor-pointer"
          value={filterModule}
          onChange={(e) => setFilterModule(e.target.value)}
        >
          <option value="All">All Modules</option>
          <option value="System Gatekeeper">System Gatekeeper</option> {/* ADDED THIS */}
          <option value="Groups">Groups</option>
          <option value="Mock Defense">Mock Defense</option>
          <option value="Deliverables">Deliverables</option>
          <option value="Files">Files</option>
          <option value="Leaderboard">Leaderboard</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">#</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">IP Address</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Module</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Description</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin text-blue-500 mx-auto" /></td>
                </tr>
              ) : filteredLogs.map((log: any, index: number) => (
                <tr key={log._id} className="hover:bg-blue-50/40 transition-colors group">
                  <td className="p-6 text-slate-300 font-mono text-xs">{filteredLogs.length - index}</td>
                  
                  {/* IP ADDRESS COLUMN */}
                  <td className="p-6 font-mono text-xs font-bold">
                    {log?.ipAddress ? (
                       <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{log.ipAddress}</span>
                    ) : (
                       <span className="text-slate-300">N/A</span>
                    )}
                  </td>

                  {/* MODULE BADGE - Now supports System Gatekeeper colors */}
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                        log.module === 'Mock Defense' ? 'bg-purple-50 text-purple-600' :
                        log.module === 'Groups' ? 'bg-emerald-50 text-emerald-600' :
                        log.module === 'System Gatekeeper' ? 'bg-orange-50 text-orange-600' : // Alert color
                        'bg-slate-100 text-slate-600'
                    }`}>
                      {log?.module ?? "Unknown"}
                    </span>
                  </td>

                  {/* DESCRIPTION - Supports both 'description' and 'details' */}
                  <td className="p-6 font-semibold text-slate-700 text-sm">
                    {log?.description || log?.details || "No description provided"}
                  </td>
                  
                  <td className="p-6 text-slate-400 text-xs font-medium">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : 
                     log.timestamp ? new Date(log.timestamp).toLocaleString() : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLogs.length === 0 && !loading && (
          <div className="p-20 text-center text-slate-400 italic font-medium">
            No audit records found matching your current search or filter.
          </div>
        )}
      </div>
    </div>
  );
}