"use client";
import React, { useState, useEffect } from 'react';
import { getGroupsFromDB } from "@/app/actions";
import { ArrowRight, Star, Clock } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [groups, setGroups] = useState([]);
  // --- ADDED THIS LINE ---
  const [loading, setLoading] = useState(true); 

  // Fetch groups on load
useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await getGroupsFromDB(); // It returns an array directly
      setGroups(data || []); // Just set the data!
      setLoading(false);
    };
    loadData();
  }, []);

  const getStatValue = (label: string) => {
    // Now 'loading' is defined!
    if (loading) return "--"; 
    
    switch (label) {
      case 'Total Groups': 
        return groups.length;
      case 'Synced Schedules': 
        // Checks if 'schedules' exists and isn't empty
        return groups.filter((g: any) => g.schedules && Object.keys(g.schedules).length > 0).length;
      case 'Pending Files':
        return "0";
      case 'Rank':
        return "#1";
      default: 
        return "0";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* 1. WELCOME HEADER */}
      <header className="flex flex-col gap-1">
        <h1 className="text-4xl font-bold tracking-tight text-slate-800">
          Welcome back, <span className="text-blue-600">Sir Pura.</span>
        </h1>
        <p className="text-slate-500 font-medium">Manage your thesis groups and optimize schedules from one central command center.</p>
      </header>

      {/* 2. STATS BAR */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {['Total Groups', 'Synced Schedules', 'Pending Files', 'Rank'].map((label, i) => (
        <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
          <p className="text-xl font-black text-slate-800">
            {getStatValue(label)} 
          </p>
        </div>
      ))}
    </div>

      {/* 3. THE BENTO GRID (The Fancy Part) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* LARGE CARD: SCHEDULE PARSER */}
        <div className="md:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">🕒</div>
          <h3 className="text-2xl font-bold mb-2">Schedule Parser</h3>
          <p className="text-slate-500 mb-6">Analyze SOLAR data to find common free time automatically.</p>
          <a href="/parser" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm inline-block">Launch Tool →</a>
        </div>

        {/* DARK CARD: LEADERBOARD PLACEHOLDER */}
        <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Leaderboard</h3>
            <p className="text-slate-400 text-xs">Top performing groups this semester.</p>
          </div>
          <div className="space-y-3 opacity-20"> {/* Visual placeholder */}
            <div className="h-3 w-full bg-white/20 rounded-full" />
            <div className="h-3 w-3/4 bg-white/20 rounded-full" />
          </div>
          <button className="w-full py-2 border border-white/20 rounded-xl text-[10px] font-bold uppercase">Coming Soon</button>
        </div>

        {/* MEDIUM CARD: GROUP MANAGER */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-6">⭐</div>
          <h3 className="font-bold mb-2">Group Manager</h3>
          <p className="text-slate-500 text-sm mb-4">Manage titles and PMs.</p>
          <a href="/groups" className="text-blue-600 font-bold text-sm">View Groups →</a>
        </div>

        {/* PLACEHOLDER: FILE REPOSITORY */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 border-dashed flex flex-col items-center justify-center text-center">
          <div className="text-slate-300 text-3xl mb-2">📁</div>
          <h3 className="font-bold text-slate-800">Repository</h3>
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">Planned Feature</p>
        </div>

        {/* PLACEHOLDER: ANALYTICS CHART */}
        <div className="bg-blue-50 p-8 rounded-[40px] border border-blue-100">
          <h3 className="font-bold text-blue-800 mb-4">Activity</h3>
          <div className="h-20 flex items-end gap-1 opacity-40">
            <div className="bg-blue-400 w-full h-[30%] rounded-t-md" />
            <div className="bg-blue-400 w-full h-[60%] rounded-t-md" />
            <div className="bg-blue-600 w-full h-[90%] rounded-t-md" />
          </div>
        </div>

      </div>
    </div>
  );
}