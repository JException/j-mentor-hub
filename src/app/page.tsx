"use client";
import React from 'react';
import { ArrowRight, Star, Clock } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="space-y-4">
        <h1 className="text-7xl font-medium tracking-tight">
          Welcome back, <span className="text-slate-300 italic">Mentor.</span>
        </h1>
        <p className="text-slate-500 text-xl max-w-2xl leading-relaxed">
          Manage your thesis groups and optimize schedules from one central command center.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Link href="/parser" className="group bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm hover:shadow-xl transition-all">
          <div className="h-14 w-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Clock size={28} />
          </div>
          <h3 className="text-2xl font-bold mb-2">Schedule Parser</h3>
          <p className="text-slate-400 mb-6">Analyze SOLAR data to find common free time for group meetings.</p>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-widest">
            Launch Tool <ArrowRight size={16} />
          </div>
        </Link>

        <Link href="/groups" className="group bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm hover:shadow-xl transition-all">
          <div className="h-14 w-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Star size={28} />
          </div>
          <h3 className="text-2xl font-bold mb-2">Group Manager</h3>
          <p className="text-slate-400 mb-6">Keep track of thesis titles, project managers, and member lists.</p>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-widest">
            Manage Data <ArrowRight size={16} />
          </div>
        </Link>
      </div>
    </div>
  );
}