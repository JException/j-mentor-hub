import React from 'react';

export default function GlobalLoader() {
  return (
    // Deep space background: dark slate with heavy blur
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md transition-all duration-300">
      
      <div className="flex flex-col items-center gap-8">
        {/* Cosmic Orbital Animation */}
        <div className="relative flex items-center justify-center w-32 h-32">
          
          {/* Outer Orbit (Slow, Indigo) */}
          <div className="absolute inset-0 rounded-full border-t-[3px] border-r-[3px] border-indigo-500/40 border-b-transparent border-l-transparent animate-[spin_3s_linear_infinite]" />
          
          {/* Middle Orbit (Reverse, Faster, Purple) */}
          <div className="absolute inset-3 rounded-full border-b-[3px] border-l-[3px] border-purple-500/60 border-t-transparent border-r-transparent animate-[spin_2s_linear_infinite_reverse]" />
          
          {/* Inner Orbit (Fastest, Fuchsia) */}
          <div className="absolute inset-7 rounded-full border-t-[3px] border-l-[3px] border-fuchsia-500/80 border-b-transparent border-r-transparent animate-[spin_1s_linear_infinite]" />
          
          {/* Glowing Nebula Core */}
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-400 via-purple-500 to-fuchsia-400 animate-pulse shadow-[0_0_40px_15px_rgba(168,85,247,0.5)]" />
          
        </div>

        {/* Minimal, Static Space-Themed Text */}
        <p className="text-xs font-bold text-indigo-200/70 uppercase tracking-[0.3em]">
          Loading...
        </p>
      </div>

    </div>
  );
}