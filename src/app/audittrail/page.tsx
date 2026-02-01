"use client";
import React, { useState, useEffect } from 'react';
import { Search, History, Globe, Clock, Loader2, Database, Lock, ShieldCheck, ArrowRight } from 'lucide-react';
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
  const ADMIN_PASSWORD = "jjcp1234"; 

  // Check if already authenticated in this session
  useEffect(() => {
    const authStatus = localStorage.getItem('audit_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      fetchLogs();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('audit_auth', 'true');
      fetchLogs();
    } else {
      setError("Incorrect administrator password.");
      setPassword("");
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    const data = await getAuditLogs();
    // DEBUG: Check your browser console to see the raw data structure
    console.log("Raw Audit Data:", data); 
    setLogs(data);
    setLoading(false);
  };

  // --- 1. RENDER PASSWORD PROMPT IF NOT AUTHENTICATED ---
  if (!isAuthenticated) {
    return (
      <div className="h-[70vh] flex items-center justify-center animate-in fade-in zoom-in duration-500">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl shadow-blue-100 border border-slate-100 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Lock className="text-blue-600" size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Restricted Access</h2>
          <p className="text-slate-500 mb-8 font-medium">Please enter the administrator password to view the security audit logs.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input 
                type="password"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl outline-none transition-all font-bold text-center text-slate-700"
                autoFocus
              />
            </div>
            {error && <p className="text-red-500 text-xs font-bold animate-bounce">{error}</p>}
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 group"
            >
              Verify Identity <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
          <p className="mt-8 text-[10px] text-slate-400 uppercase tracking-widest font-black flex items-center justify-center gap-2">
            <ShieldCheck size={12} /> Secure Audit System v3.0
          </p>
        </div>
      </div>
    );
  }

  // --- 2. RENDER ACTUAL CONTENT IF AUTHENTICATED ---
  const filteredLogs = logs.filter((log: any) => {
    // Optional chaining and fallback strings prevent "undefined" crashes
    const description = log?.description?.toLowerCase() ?? "";
    const ipAddress = log?.ipAddress ?? "";
    const module = log?.module ?? "Unknown";
    
    const searchTerm = search.toLowerCase();
    
    const matchesSearch = 
      description.includes(searchTerm) || 
      ipAddress.includes(searchTerm);
      
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
        
        <button 
          onClick={() => {
            localStorage.removeItem('audit_auth');
            window.location.reload();
          }}
          className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors"
        >
          Logout Session
        </button>

        <button 
  onClick={async () => {
    if(confirm("Clear all logs?")) {
       await clearAuditLogs(); 
       window.location.reload();
    }
  }}
  className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 ml-4"
>
  Clear Logs
</button>
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
                  <td className="p-6 text-slate-300 font-mono text-xs">{logs.length - index}</td>
                  <td className="p-6 font-mono text-sm text-blue-600 font-bold">{log?.ipAddress ?? "N/A"}</td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                        log.module === 'Mock Defense' ? 'bg-purple-50 text-purple-600' :
                        log.module === 'Groups' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-slate-100 text-slate-600'
                    }`}>
                      {log?.module ?? "Unknown"}
                    </span>
                  </td>
                  <td className="p-6 font-semibold text-slate-700">{log?.description ?? "No description provided"}</td>
                  <td className="p-6 text-slate-400 text-xs">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : "N/A"}
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