"use client";
import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export function SysAdminButton() {
  return (
    // Container defines the "invisible hit zone" in the bottom right corner
    <div className="fixed bottom-0 right-0 z-50 p-6 opacity-0 hover:opacity-100 transition-opacity duration-500">
      <Link 
        href="/audittrail" 
        // The actual button styling
        className="flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-lg shadow-slate-200/50 px-4 py-2 rounded-full hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
        title="System Audit Trail"
      >
        {/* Inner group for hover styling of icon and text */}
        <div className="group flex items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-full group-hover:bg-blue-50 transition-colors">
                <ShieldCheck size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase group-hover:text-slate-600 transition-colors">
              SYS.ADMIN
            </span>
        </div>
      </Link>
    </div>
  );
}