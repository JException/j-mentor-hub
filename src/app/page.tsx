"use client";
import React, { useState, useEffect } from 'react';
import { getLeaderboardData, getDeliverablesFromDB } from "./actions"; 
import GlobalLoader from "../components/GlobalLoader";
import { 
  ArrowRight, Clock, Trophy, Calendar, Users, 
  CheckCircle2, CircleDashed, CheckSquare, FileText, FolderOpen, 
  Image as ImageIcon, GraduationCap, Gavel, LayoutDashboard
} from 'lucide-react';
import Link from 'next/link';
import IntroAnimation from "./../components/IntroAnimation-test";

// --- HELPER: Calculate next specific date AND TIME ---
const getNextOccurrence = (dayName: string, timeString: string) => {
  if (!dayName || !timeString || dayName === "TBA") return null;

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayIndex = daysOfWeek.findIndex(d => d.toLowerCase() === dayName.toLowerCase());
  
  if (dayIndex === -1) return null;

  const now = new Date();
  const currentDayIndex = now.getDay();
  
  let daysUntil = dayIndex - currentDayIndex;
  if (daysUntil < 0) daysUntil += 7; 

  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysUntil);

  try {
      const [time, modifier] = timeString.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
  
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
  
      nextDate.setHours(hours, minutes, 0, 0);
  } catch (e) {
      console.error("Time parse error", e);
  }

  return nextDate;
};

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState("Sir Pura"); 
  
  const [topGroups, setTopGroups] = useState<any[]>([]); 
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]); 
  const [recentFiles, setRecentFiles] = useState<any[]>([]); 

  const [stats, setStats] = useState({ 
    totalGroups: 0, 
    mentoringCount: 0, 
    panelingCount: 0, 
    synced: 0, 
    students: 0, 
    accumulatedScore: 0,
    maxPossibleScore: 0,
    tasksDone: 0,        
    tasksOngoing: 0,     
    tasksNotStarted: 0,
    groupsWithFiles: 0,
    menteeFilesCount: 0,
    nonMenteeFilesCount: 0
  });

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true); 
  

  useEffect(() => {
    document.documentElement.classList.add('dark');

    const checkUser = () => {
      const storedUser = localStorage.getItem("audit_user") || localStorage.getItem("currentUser");
      if (storedUser) setCurrentUser(storedUser.replace(/^"|"$/g, ''));
    };
    checkUser();
    window.addEventListener('auth-change', checkUser);

    const loadData = async () => {
      setLoading(true);
      
      try {
        const lbData = await getLeaderboardData();
        const tasksData = await getDeliverablesFromDB(); 

        const { groups = [], progress = [] } = lbData || {};

        const myNameKeywords = ["Pura", "Justine", "Jude", "JJCP"].map(n => n.toLowerCase());
        
        let panelistCount = 0;
        let totalMenteeFiles = 0;
        let totalReviewFiles = 0;

        const groupsWithScores = groups.map((group: any) => {
          const p = group.panelists || {};
          const panelistString = `${p.chair || ''} ${p.internal || ''} ${p.external || ''}`.toLowerCase();
          const isPanelist = myNameKeywords.some(keyword => panelistString.includes(keyword));

          if (isPanelist) {
             panelistCount++;
          }

          const groupId = group._id.toString();
          const groupProgress = progress.filter((p: any) => p.groupId === groupId);
          let score = 0;
          groupProgress.forEach((p: any) => {
            if (p.status === 'Done') score += 10;
            else if (p.status === 'In Progress') score += 5;
          });

          return { ...group, totalScore: score, isPanelistGroup: isPanelist };
        });

        const mentoring = groups.length - panelistCount;

        const sorted = groupsWithScores.sort((a: any, b: any) => {
          if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
          return a.groupName.localeCompare(b.groupName);
        });
        setTopGroups(sorted.slice(0, 4)); 

        const upcomingConsultations = groups
          .map((group: any) => {
            const day = group.schedules?.day || group.consultationDay; 
            const time = group.schedules?.time || group.consultationTime;
            if (!day || !time) return null;
            const nextDate = getNextOccurrence(day, time);
            return {
              groupName: group.groupName,
              nextDate: nextDate,
              dayDisplay: day,
              timeDisplay: time,
              adviser: group.adviser || "iCare Office"
            };
          })
          .filter((item: any) => item !== null && item.nextDate !== null)
          .sort((a: any, b: any) => a.nextDate - b.nextDate); 

        setConsultations(upcomingConsultations);

        const totalSystemScore = groupsWithScores.reduce((acc: number, group: any) => acc + group.totalScore, 0);
        
        const today = new Date();
        const pastTasks = (tasksData || []).filter((t: any) => new Date(t.deadline) <= today);
        const maxPointsPerGroupSoFar = pastTasks.reduce((acc: number, t: any) => acc + (t.points || 10), 0);
        const maxSystemScore = maxPointsPerGroupSoFar * groups.length;

        let countDone = 0;
        let countOngoing = 0;
        progress.forEach((p: any) => {
            if (p.status === 'Done') countDone++;
            if (p.status === 'In Progress') countOngoing++;
        });

        const totalExpected = groups.length * pastTasks.length;
        const countNotStarted = Math.max(0, totalExpected - (countDone + countOngoing));

        let allFiles: any[] = [];
        let groupsUploadedCount = 0;
        
        groupsWithScores.forEach((g: any) => {
            if (g.files && g.files.length > 0) {
                groupsUploadedCount++;
                const fileCount = g.files.length;

                if (g.isPanelistGroup) {
                    totalReviewFiles += fileCount;
                } else {
                    totalMenteeFiles += fileCount;
                }

                const groupFiles = g.files.map((f: any) => ({
                    ...f,
                    groupName: g.groupName,
                    uploadedAt: f.uploadedAt || new Date().toISOString()
                }));
                allFiles = [...allFiles, ...groupFiles];
            }
        });
        allFiles.sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        setRecentFiles(allFiles.slice(0, 3));

        setStats({
          totalGroups: groups.length,
          mentoringCount: mentoring,
          panelingCount: panelistCount,
          synced: upcomingConsultations.length, 
          students: groups.reduce((acc: number, g: any) => acc + (g.members?.length || 0), 0),
          accumulatedScore: totalSystemScore,
          maxPossibleScore: maxSystemScore,
          tasksDone: countDone,
          tasksOngoing: countOngoing,
          tasksNotStarted: countNotStarted,
          groupsWithFiles: groupsUploadedCount,
          menteeFilesCount: totalMenteeFiles,
          nonMenteeFilesCount: totalReviewFiles
        });

        const upcoming = (tasksData || [])
          .filter((t: any) => t.deadline >= today.toISOString().split('T')[0])
          .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
          .slice(0, 3);
          
        setDeliverables(upcoming);

      } catch (e) {
        console.error("Error loading dashboard data", e);
      } finally {
         setLoading(false);
         setLastUpdated(new Date().toLocaleString('en-US', { 
         month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true 
  }));
      }
    };
    loadData();

    return () => window.removeEventListener('auth-change', checkUser);
  }, [currentUser]); 

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const progressPercentage = stats.maxPossibleScore > 0 
    ? Math.min(100, Math.round((stats.accumulatedScore / stats.maxPossibleScore) * 100)) 
    : 0;

  const uploadPercentage = stats.totalGroups > 0 
    ? Math.round((stats.groupsWithFiles / stats.totalGroups) * 100) 
    : 0;

  const isGoalMet = !loading && stats.maxPossibleScore > 0 && stats.accumulatedScore >= stats.maxPossibleScore;

  return (
    <> 
      {loading && <GlobalLoader />}
      
      {/* ADDED w-full and flex-1 to ensure it stretches across available space */}
      <div className="min-h-screen w-full flex-1 bg-[#060B19] text-slate-200 relative overflow-hidden font-sans selection:bg-purple-500/30">
        
        {/* Adjusted Responsive Orbs */}
        <div className="absolute top-[-5%] left-[-10%] w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-indigo-600/20 rounded-full blur-[80px] md:blur-[120px] mix-blend-screen pointer-events-none"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[350px] h-[350px] md:w-[600px] md:h-[600px] bg-fuchsia-600/10 rounded-full blur-[100px] md:blur-[150px] mix-blend-screen pointer-events-none"></div>
        <div className="absolute top-[30%] left-[10%] w-[250px] h-[250px] md:w-[400px] md:h-[400px] bg-blue-500/10 rounded-full blur-[80px] md:blur-[100px] mix-blend-screen pointer-events-none"></div>

        <IntroAnimation />
        
        {/* Reduced padding on mobile (p-4 to p-3, gap tweaks) */}
        <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 md:space-y-8 relative z-10">
          
          {/* HEADER */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-10 mt-2 md:mt-0">
            <div className="space-y-1">
              {/* Scaled down text for mobile */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                JJCP Thesis <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400"> Mentoring Hub 5.0</span>
              </h1>
              <p className="text-indigo-200/60 font-medium flex items-center gap-2 mt-2 text-sm md:text-base">
                 <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
                 Welcome back, {currentUser}. Here is your cosmic briefing.
              </p>
            </div>
            <div className="hidden md:block text-right bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl">
               <p className="text-[10px] uppercase font-bold text-indigo-300/50 tracking-[0.2em]">System Status</p>
               <p className="text-sm font-bold text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">All Systems Operational</p>
            </div>
          </header>

          {/* --- HERO STATS GRID --- */}
          {/* Switched to grid-cols-1 sm:grid-cols-2 for better tablet/mobile bridging */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            
            {/* 1. INNOVATIVE SPLIT CARD */}
            <Link href="/groups" className="col-span-1 block group h-full">
              <div className="relative h-full min-h-[140px] bg-white/5 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2rem] border border-white/10 overflow-hidden hover:border-indigo-400/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all duration-300">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                  
                  <div className="h-full flex flex-col">
                     <div className="flex-1 p-4 md:p-5 pb-2 border-b border-white/5 group-hover:bg-indigo-500/10 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                           <div className="flex items-center gap-2 text-indigo-400">
                              <GraduationCap className="w-4 h-4 md:w-5 md:h-5" />
                              <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Mentoring</span>
                           </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                           <span className="text-2xl md:text-3xl font-black text-white">
                              {loading ? "-" : stats.mentoringCount}
                           </span>
                           <span className="text-[10px] md:text-xs font-medium text-indigo-200/50">groups</span>
                        </div>
                     </div>

                     <div className="flex-1 p-4 md:p-5 pt-2 md:pt-3 bg-black/20 group-hover:bg-purple-500/10 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                           <div className="flex items-center gap-2 text-purple-400">
                              <Gavel className="w-[14px] h-[14px] md:w-4 md:h-4" />
                              <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Panelist</span>
                           </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                           <span className="text-2xl md:text-3xl font-black text-white">
                              {loading ? "-" : stats.panelingCount}
                           </span>
                           <span className="text-[10px] md:text-xs font-medium text-purple-200/50">groups</span>
                        </div>
                     </div>
                  </div>
              </div>
            </Link>

            {/* 2. SYNCED SCHEDULES */}
            <Link href="/parser" className="block col-span-1 h-full">
              <div className="bg-white/5 backdrop-blur-xl p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-white/10 transition-all duration-300 hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)] cursor-pointer h-full relative overflow-hidden flex flex-col justify-between group min-h-[140px]">
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl -mr-5 -mt-5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="flex items-center gap-3 mb-2 md:mb-4">
                   <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                      <Calendar size={18} />
                   </div>
                   <p className="text-[9px] md:text-[10px] font-bold text-indigo-200/50 uppercase tracking-widest">Synced</p>
                </div>

                <div>
                  <p className="text-3xl md:text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                      {loading ? "--" : stats.synced}
                  </p>
                  <p className="text-[10px] md:text-xs text-cyan-200/60 mt-1">Confirmed Schedules</p>
                </div>
              </div>
            </Link>

            {/* 3. STUDENTS */}
            <Link href="/masterlist" className="block col-span-1 h-full">
              <div className="bg-white/5 backdrop-blur-xl p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-white/10 transition-all duration-300 hover:border-fuchsia-400/50 hover:shadow-[0_0_30px_rgba(232,121,249,0.15)] cursor-pointer h-full relative overflow-hidden flex flex-col justify-between group min-h-[140px]">
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-fuchsia-500/20 rounded-full blur-2xl -ml-5 -mb-5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="flex items-center gap-3 mb-2 md:mb-4">
                   <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 flex items-center justify-center">
                      <Users size={18} />
                   </div>
                   <p className="text-[9px] md:text-[10px] font-bold text-indigo-200/50 uppercase tracking-widest">Students</p>
                </div>

                <div>
                  <p className="text-3xl md:text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                      {loading ? "--" : stats.students}
                  </p>
                  <p className="text-[10px] md:text-xs text-fuchsia-200/60 mt-1">Active Researchers</p>
                </div>
              </div>
            </Link>

            {/* 4. TOTAL SCORE PROGRESS */}
            <div className="relative bg-white/5 backdrop-blur-xl p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-white/10 shadow-sm transition-all duration-300 h-full col-span-1 flex flex-col justify-between overflow-hidden min-h-[140px]">
               <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 ${isGoalMet ? 'bg-cyan-500/20' : 'bg-blue-500/20'}`}></div>

               <div className="flex justify-between items-start z-10 mb-4 md:mb-0">
                  <div className="flex flex-col">
                     <span className="text-[9px] md:text-[10px] font-bold text-indigo-200/50 uppercase tracking-[0.2em] mb-1">Total Score</span>
                     <div className="flex items-baseline gap-1">
                       <span className={`text-2xl md:text-3xl font-black drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] ${isGoalMet ? "text-cyan-400" : "text-indigo-400"}`}>
                          {loading ? "--" : stats.accumulatedScore}
                       </span>
                       <span className="text-[10px] md:text-xs font-bold text-slate-500">/ {stats.maxPossibleScore}</span>
                     </div>
                  </div>
                  {isGoalMet && <CheckCircle2 className="text-cyan-400 animate-pulse drop-shadow-[0_0_10px_rgba(34,211,238,0.8)] w-5 h-5 md:w-6 md:h-6" />}
               </div>

               <div className="space-y-2 z-10">
                  <div className="w-full h-1.5 md:h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                     <div 
                       className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor] ${isGoalMet ? "bg-cyan-400" : "bg-gradient-to-r from-indigo-500 to-purple-500"}`}
                       style={{ width: `${loading ? 0 : progressPercentage}%` }}
                     />
                  </div>
                  <div className="flex justify-between text-[8px] md:text-[9px] font-bold uppercase text-indigo-300/60">
                     <span>Progress</span>
                     <span>{progressPercentage}%</span>
                  </div>
               </div>
            </div>
          </div>

          {/* --- BENTO GRID CONTENT --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            
           {/* CONSULTATION SCHEDULE */}
            <div className="md:col-span-2 bg-white/5 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2.5rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden flex flex-col">
                <div className="p-5 md:p-8 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                        <Clock className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-2xl font-bold text-white">Upcoming Consultations</h3>
                      <p className="text-indigo-200/50 text-[10px] md:text-xs font-medium">Synced from Google Sheets</p>
                    </div>
                  </div>
                  
                  <Link href="/parser" className="w-full sm:w-auto text-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors">
                     Update <ArrowRight className="w-3 h-3"/>
                  </Link>
               </div>

               <div className="flex-1 overflow-y-auto max-h-[400px] md:max-h-[550px] p-4 md:p-6 space-y-3 custom-scrollbar">
                  {loading ? (
                    <div className="text-center py-8 text-indigo-300/50 text-xs md:text-sm animate-pulse">Syncing cosmic calendar...</div>
                  ) : consultations.length > 0 ? (
                    consultations.map((consult, idx) => (
                      <div key={idx} className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 md:p-4 rounded-xl md:rounded-2xl bg-black/20 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all gap-3 md:gap-4">
                          <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
                              <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 text-white h-10 w-12 md:h-12 md:w-14 rounded-lg md:rounded-xl shrink-0 shadow-inner">
                                  <span className="text-[8px] md:text-[9px] font-bold uppercase text-indigo-300/70">{consult.dayDisplay.substring(0,3)}</span>
                                  <span className="text-base md:text-lg font-black leading-none drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">{consult.nextDate.getDate()}</span>
                              </div>
                              
                              <div className="overflow-hidden">
                                <h3 className="text-xs md:text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors truncate">{consult.groupName}</h3>
                                <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-indigo-200/50 mt-1">
                                   <span className="flex items-center gap-1"><Clock size={10} className="text-indigo-400"/> {consult.timeDisplay}</span>
                                   <span className="hidden sm:inline text-white/20">•</span>
                                   <span className="truncate">{consult.adviser}</span>
                                </div>
                              </div>
                          </div>

                          <div className="self-start sm:self-center shrink-0 mt-2 sm:mt-0">
                             <span className="text-[8px] md:text-[9px] font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2 py-1 md:px-3 md:py-1.5 rounded-full flex items-center gap-1 md:gap-1.5 shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                                <CheckCircle2 size={10} /> CONFIRMED
                             </span>
                          </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                       <p className="text-indigo-200/40 text-xs md:text-sm mb-2">No schedules synced in this quadrant.</p>
                    </div>
                  )}
               </div>
            </div>

            {/* RIGHT COLUMN STACK */}
            <div className="flex flex-col gap-4 md:gap-6">

               {/* LEADERBOARD CARD */}
              <div className="bg-black/40 backdrop-blur-xl p-5 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col relative overflow-hidden min-h-[250px] md:min-h-[300px]">
                <div className="absolute top-0 right-0 w-32 md:w-48 h-32 md:h-48 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full blur-[40px] md:blur-[60px] pointer-events-none -mr-10 -mt-10"></div>

                <div className="flex items-center justify-between mb-4 md:mb-6 z-10">
                  <h3 className="text-base md:text-lg font-bold flex items-center gap-2 text-white">
                      <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" /> Leaderboard
                  </h3>
                  <Link href="/leaderboards" className="text-[9px] md:text-[10px] font-bold text-indigo-300/70 hover:text-white transition-colors uppercase tracking-[0.2em] bg-white/5 border border-white/10 px-2 py-1 md:px-3 md:py-1 rounded-full">View All</Link>
                </div>
                
                <div className="flex-1 flex flex-col gap-2 md:gap-3 z-10 overflow-y-auto custom-scrollbar pr-1 md:pr-2"> 
                  {loading ? (
                      <div className="space-y-3 opacity-20 animate-pulse"> 
                          <div className="h-10 md:h-12 w-full bg-white/10 rounded-xl" />
                          <div className="h-10 md:h-12 w-full bg-white/10 rounded-xl" />
                      </div>
                  ) : topGroups.length > 0 ? (
                      topGroups.map((group, index) => (
                          <div key={group._id} className="flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors p-2 md:p-3 rounded-xl md:rounded-2xl border border-white/5">
                              <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                                  <div className={`w-6 h-6 md:w-8 md:h-8 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] md:text-xs font-black shadow-lg
                                      ${index === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-yellow-950 shadow-[0_0_15px_rgba(250,204,21,0.4)]' : 
                                        index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900 shadow-[0_0_10px_rgba(203,213,225,0.3)]' : 
                                        index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-orange-950 shadow-[0_0_10px_rgba(249,115,22,0.3)]' :
                                        'bg-white/10 text-white/50 border border-white/10'
                                      }`}>
                                      {index + 1}
                                  </div>
                                  <span className="font-semibold text-xs md:text-sm truncate text-slate-200 max-w-[120px] md:max-w-[100px]">
                                      {group.groupName}
                                  </span>
                              </div>
                              <span className="font-mono font-bold text-cyan-400 text-xs md:text-sm bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 md:px-2 md:py-1 rounded-lg">
                                  {group.totalScore}
                              </span>
                          </div>
                      ))
                  ) : (
                      <div className="h-full flex items-center justify-center text-indigo-300/40 text-xs md:text-sm">No rankings.</div>
                  )}
                </div>
              </div>

              {/* UPCOMING DEADLINES */}
              <div className="bg-indigo-900/20 backdrop-blur-xl p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-indigo-500/20 flex flex-col flex-1 relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-purple-500/20 rounded-full blur-[40px] md:blur-[50px] pointer-events-none"></div>

                <h3 className="font-bold text-sm md:text-base text-white mb-4 md:mb-5 flex items-center gap-2 relative z-10">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-purple-400" /> Deliverables
                </h3>
                
                <div className="space-y-2 md:space-y-3 flex-1 relative z-10">
                  {loading ? (
                        <p className="text-indigo-300/50 text-[10px] md:text-xs">Scanning timeline...</p>
                  ) : deliverables.length > 0 ? (
                      deliverables.map((task, i) => {
                          const [month, day] = formatDate(task.deadline).split(' ');
                          return (
                            <div key={i} className="flex items-center gap-3 md:gap-4 bg-black/40 p-2 md:p-3 rounded-xl md:rounded-2xl border border-white/5 hover:border-purple-500/30 transition-colors">
                                <div className="flex flex-col items-center justify-center bg-purple-500/10 border border-purple-500/20 px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg md:rounded-xl min-w-[45px] md:min-w-[55px]">
                                      <span className="text-[8px] md:text-[9px] font-bold text-purple-300 uppercase leading-none mb-1">{month}</span>
                                      <span className="text-lg md:text-xl font-black text-purple-400 leading-none drop-shadow-[0_0_5px_rgba(192,132,252,0.5)]">{day}</span>
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-xs md:text-sm font-bold text-slate-200 truncate">{task.taskName}</span>
                                    <span className="text-[9px] md:text-[10px] text-indigo-300/60 truncate uppercase tracking-[0.1em] mt-0.5">{task.type}</span>
                                </div>
                            </div>
                          );
                      })
                  ) : (
                      <div className="h-full flex items-center justify-center text-indigo-300/40 text-[10px] md:text-xs">Timeline clear. No pending deadlines.</div>
                  )}
                </div>
                
                <div className="mt-4 md:mt-5 text-center relative z-10">
                  <Link href="/deliverables" className="inline-block text-[9px] md:text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em] hover:text-purple-300 transition-colors bg-purple-500/10 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-purple-500/20 w-full sm:w-auto">View Calendar</Link>
                </div>
              </div>

            </div>

            {/* BOTTOM ROW: REPOSITORY */}
            <div className="md:col-span-3 bg-white/5 backdrop-blur-xl p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col md:flex-row gap-6 md:gap-8 transition-colors">
                <div className="md:w-1/3 border-b md:border-b-0 md:border-r border-white/10 pb-5 md:pb-0 md:pr-8 flex flex-col">
                  
                  <Link href="/files" className="inline-block self-start group">
                      <div className="h-10 w-10 md:h-12 md:w-12 bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-5 cursor-pointer group-hover:bg-fuchsia-500/20 transition-all shadow-[0_0_15px_rgba(232,121,249,0.2)]">
                        <FolderOpen className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                  </Link>

                  <h3 className="text-lg md:text-xl font-bold text-white mb-1 md:mb-2">Data Repository</h3>
                  <p className="text-xs md:text-sm text-indigo-200/50 mb-6 md:mb-8">Interstellar transmission logs & uploads.</p>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl md:text-3xl font-black text-white">{stats.groupsWithFiles}</span>
                    <span className="text-[10px] md:text-xs font-medium text-indigo-300/50">groups actively transmitting</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden mb-6 md:mb-8 border border-white/5">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full shadow-[0_0_10px_rgba(232,121,249,0.8)]" style={{ width: `${uploadPercentage}%` }}></div>
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-3 md:gap-4">
                      <div className="p-3 md:p-4 bg-indigo-500/10 rounded-xl md:rounded-2xl border border-indigo-500/20 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-12 h-12 md:w-16 md:h-16 bg-indigo-500/20 blur-xl"></div>
                          <p className="text-[8px] md:text-[10px] font-bold uppercase text-indigo-300 tracking-[0.1em] mb-1 relative z-10">Mentee Files</p>
                          <p className="text-2xl md:text-3xl font-black text-white relative z-10">{loading ? '-' : stats.menteeFilesCount}</p>
                      </div>
                      <div className="p-3 md:p-4 bg-white/5 rounded-xl md:rounded-2xl border border-white/10 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-12 h-12 md:w-16 md:h-16 bg-white/5 blur-xl"></div>
                          <p className="text-[8px] md:text-[10px] font-bold uppercase text-indigo-200/50 tracking-[0.1em] mb-1 relative z-10">Review Files</p>
                          <p className="text-2xl md:text-3xl font-black text-slate-300 relative z-10">{loading ? '-' : stats.nonMenteeFilesCount}</p>
                      </div>
                  </div>
                </div>

                <div className="bg-black/30 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 border border-white/5 w-full h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                      <h4 className="text-[10px] md:text-xs font-bold text-indigo-200/60 uppercase tracking-[0.2em]">Recent Transmissions</h4>
                      <Link href="/files" className="text-[9px] md:text-[10px] font-bold text-fuchsia-400 uppercase tracking-[0.2em] hover:text-fuchsia-300 transition-colors bg-fuchsia-500/10 border border-fuchsia-500/20 px-2 py-1 md:px-3 md:py-1.5 rounded-full">View Database</Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 flex-1">
                      {loading ? (
                          <div className="col-span-1 sm:col-span-2 md:col-span-3 flex items-center justify-center text-indigo-300/40 text-xs md:text-sm">Decoding files...</div>
                      ) : recentFiles.length > 0 ? (
                          recentFiles.map((file, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/5 p-4 md:p-5 rounded-xl md:rounded-2xl flex flex-col justify-between hover:bg-white/10 hover:border-fuchsia-500/30 transition-all group">
                                <div className="flex justify-between items-start mb-4 md:mb-6">
                                  <div className="text-fuchsia-400 drop-shadow-[0_0_8px_rgba(232,121,249,0.4)]">
                                      {file.url && (file.url.endsWith('.png') || file.url.endsWith('.jpg')) 
                                        ? <ImageIcon size={20}/> 
                                        : <FileText size={20}/>}
                                  </div>
                                  <span className="text-[8px] md:text-[9px] font-bold text-indigo-200/50 bg-black/50 border border-white/5 px-2 py-1 rounded-lg">{formatDate(file.uploadedAt)}</span>
                                </div>
                                <div>
                                  <p className="text-xs md:text-sm font-bold text-slate-200 truncate mb-1 md:mb-1.5 group-hover:text-fuchsia-300 transition-colors" title={file.name}>{file.name || "Unknown_Signal.dat"}</p>
                                  <p className="text-[9px] md:text-[10px] text-fuchsia-300 font-bold truncate bg-fuchsia-500/10 border border-fuchsia-500/20 inline-block px-2 md:px-2.5 py-0.5 md:py-1 rounded-md">
                                      {file.groupName}
                                  </p>
                                </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-1 sm:col-span-2 md:col-span-3 flex items-center justify-center text-indigo-300/40 text-[10px] md:text-sm border-2 border-dashed border-white/5 rounded-xl md:rounded-2xl h-full min-h-[100px] md:min-h-[120px]">No recent transmissions found.</div>
                      )}
                  </div>
                </div>
            </div>

          </div> 

        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
      `}</style>
    </>
  );
}