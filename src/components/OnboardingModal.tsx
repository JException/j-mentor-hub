"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, GraduationCap, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop with Blur */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#060B19]/80 backdrop-blur-xl"
        />

        {/* Modal Container */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="relative bg-[#0c142b] border border-slate-800 rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden grid lg:grid-cols-2"
        >
          {/* LEFT: CONTENT */}
          <div className="p-8 lg:p-12 space-y-8 flex flex-col justify-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <Sparkles size={12} /> System Initialized
              </div>
              
              <h2 
  className="text-4xl font-bold text-white tracking-tight leading-tight glitch-text" 
  data-text="Welcome to the Mentorship Hub"
>
  Welcome to the <span className="text-indigo-500 italic">Mentorship Hub</span>
</h2>



              <p className="text-slate-400 leading-relaxed font-medium">
                Welcome, Mentor. You are now entering a specialized Thesis Management System designed to bridge the gap between academic research and industry excellence. 
                Streamline your workflow, track milestones, and manage mentorship with 
                precision-engineered tools.
              </p>
            </div>

            {/* Feature List */}
            <div className="space-y-4">
              <FeatureItem icon={<GraduationCap className="text-indigo-500"/>} text="Automated Thesis Milestone Tracking" />
              <FeatureItem icon={<ShieldCheck className="text-emerald-500"/>} text="Secure Research Documentation" />
              <FeatureItem icon={<Rocket className="text-amber-500"/>} text="Enhanced Collaborative Workflow" />
            </div>

            <button 
  onClick={onClose}
  className="group relative w-full lg:w-fit px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 overflow-hidden border border-indigo-400/30"
>{/* The "Glow" behind the button */}
  <div className="absolute inset-0 bg-indigo-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity" />
  
  <span className="relative z-10">Initialize System</span> 
  <ArrowRight size={18} className="relative z-10 group-hover:translate-x-2 transition-transform" />

  {/* Animated Glitch Stripe for the button */}
  <motion.div 
    animate={{ 
      x: ['-100%', '200%'],
      opacity: [0, 1, 0] 
    }}
    transition={{ 
      duration: 2, 
      repeat: Infinity, 
      repeatDelay: 3 
    }}
    className="absolute top-0 left-0 w-20 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" 
  />
</button>
          </div>

          {/* RIGHT: IMAGE (The "Tilted" Preview) */}
<div className="hidden lg:flex bg-slate-900/50 items-center justify-center p-12 border-l border-slate-800 relative overflow-hidden">
  {/* Background Glow */}
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/30 blur-[120px] rounded-full" />
  
  <motion.div 
    whileHover={{ rotateY: -10, rotateX: 5, scale: 1.02 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    className="relative w-full aspect-[4/5] rounded-3xl shadow-[0_0_50px_rgba(79,70,229,0.2)] border border-white/10 overflow-hidden transform-gpu bg-slate-800"
    style={{ perspective: 1000 }}
  >
     <img 
  src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80"
  alt="System Preview" 
  className="w-full h-full object-cover opacity-100 relative z-0"
  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // TypeScript friendly way to handle the error
    const target = e.currentTarget;
    target.style.display = 'none';
    
    // Log to console only if in development
    if (process.env.NODE_ENV === 'development') {
      console.warn("Modal image failed to load. Check if /public/nebula.jpg exists.");
    }
  }}
/>

     {/* Glassmorphism Overlays - z-index ensures they sit ON TOP of the image */}
     <div className="absolute inset-0 bg-gradient-to-t from-[#0c142b] via-transparent to-white/5 pointer-events-none z-10" />
     
     {/* Decorative "Scanning" Line */}
     <motion.div 
       animate={{ y: [0, 450, 0] }}
       transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
       className="absolute top-0 left-0 w-full h-[2px] bg-indigo-500/50 shadow-[0_0_15px_indigo] z-20"
     />

     {/* UI Corner Accents */}
     <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-indigo-500/50 z-20" />
     <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-indigo-500/50 z-20" />
  </motion.div>
</div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div className="flex items-center gap-3 text-slate-300 font-bold text-sm">
      <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700">
        {icon}
      </div>
      {text}
    </div>
  );
}