"use client";
import React from 'react';
import ProfileCard from '@/components/ProfileCard';
import { 
  Code2, Cpu, Globe, Mail, Github, 
  Twitter, Award, Zap, Terminal 
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="min-h-screen p-8 pt-12 max-w-7xl mx-auto space-y-12">
      
      {/* HEADER SECTION */}
      <header className="space-y-2">
        <div className="flex items-center gap-3 text-indigo-400 mb-2">
          <Terminal size={20} />
          <span className="text-xs font-black tracking-[0.3em] uppercase">System Access / Developer Profile</span>
        </div>
        <h1 className="text-5xl font-medium tracking-tight text-slate-100">
          Behind the <span className="text-indigo-500 italic">Nebula</span>
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* LEFT COLUMN: THE CARD */}
        <div className="lg:col-span-5 flex justify-center lg:justify-start">
          <ProfileCard
            name="JJ Pura"
            title="Full Stack Developer | Educator"
            handle="jjcp_"
            status="Online"
            contactText="Get in Touch"
            avatarUrl="JJCP.jpg"
            showUserInfo={true}
            enableTilt={true}
            behindGlowEnabled={true}
            behindGlowColor="rgba(99, 102, 241, 0.4)" // Indigo Glow
            innerGradient="linear-gradient(145deg, #0c142b 0%, #1e293b 100%)"
          />
        </div>

        {/* RIGHT COLUMN: DEVELOPER INTRO & STATS */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* About Section */}
          <section className="bg-[#0c142b] border border-slate-800 p-8 rounded-[32px] space-y-4 shadow-xl">
            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Code2 className="text-indigo-500" size={20} />
              The Architect
            </h3>
            <p className="text-slate-400 leading-relaxed font-medium">
  Hello! I'm an Assistant Professor and Software Engineer dedicated to bridging 
  the gap between advanced Computer Science theory and real-world application. 
  With a background as a DICT Master Trainer and an MBA from National Sun Yat-sen University, 
  I specialize in building high-performance systems that empower users through 
  digital literacy and clean, scalable architecture. 
  This Thesis Management System was architected to streamline academic workflows 
  using the Nebula Design System, drawing from my years of experience in both 
  the classroom and the tech industry.
</p>
          </section>

          {/* Tech Stack Grid */}
          <div className="grid grid-cols-2 gap-4">
            <StatBox icon={<Zap className="text-amber-400"/>} label="Core Stack" value="Next.js / TS" />
            <StatBox icon={<Cpu className="text-emerald-400"/>} label="Database" value="MongoDB" />
            <StatBox icon={<Globe className="text-indigo-400"/>} label="Styling" value="Tailwind CSS" />
            <StatBox icon={<Award className="text-rose-400"/>} label="Experience" value="9+ Years" />
          </div>

          {/* Social Links */}
          <div className="flex flex-wrap gap-4">
            <SocialButton icon={<Github size={18}/>} label="GitHub" href="#" />
            <SocialButton icon={<Twitter size={18}/>} label="Twitter" href="#" />
            <SocialButton icon={<Mail size={18}/>} label="Email" href="#" />
          </div>

        </div>
      </div>
    </div>
  );
}

// 🟢 Helper Components for the Profile Page
const StatBox = ({ icon, label, value }: any) => (
  <div className="bg-[#0c142b]/50 border border-slate-800 p-5 rounded-2xl hover:border-indigo-500/50 transition-all group">
    <div className="flex items-center gap-3 mb-2">
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
    </div>
    <div className="text-slate-200 font-bold">{value}</div>
  </div>
);

const SocialButton = ({ icon, label, href }: any) => (
  <a href={href} className="flex items-center gap-2 px-6 py-3 bg-[#0c142b] border border-slate-800 text-slate-400 rounded-xl font-bold text-xs uppercase tracking-widest hover:text-white hover:border-indigo-500 hover:bg-indigo-500/10 transition-all">
    {icon}
    {label}
  </a>
);