"use client";
import React, { useState, useEffect } from 'react';
import { getLeaderboardData, getDeliverablesFromDB } from "@/app/actions"; 
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
  // --- STATE FOR USER IDENTITY ---
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
    // --- NEW STATS FOR FILE AUDIT ---
    menteeFilesCount: 0,
    nonMenteeFilesCount: 0
  });

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  

  useEffect(() => {
    // 1. Dark Mode Logic
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedMode);
    if (savedMode) document.documentElement.classList.add('dark');

    // 2. Auth Check
    const checkUser = () => {
      const storedUser = localStorage.getItem("audit_user") || localStorage.getItem("currentUser");
      if (storedUser) setCurrentUser(storedUser.replace(/^"|"$/g, ''));
    };
    checkUser();
    window.addEventListener('auth-change', checkUser);

    // 3. LOAD DATA
    const loadData = async () => {
      setLoading(true);
      
      try {
        const lbData = await getLeaderboardData();
        const tasksData = await getDeliverablesFromDB(); 

        const { groups = [], progress = [] } = lbData || {};

  
        // Regex/Keywords for Role Detection
        const myNameKeywords = ["Pura", "Justine", "Jude", "JJCP"].map(n => n.toLowerCase());
        
        let panelistCount = 0;

        // --- NEW VARIABLES FOR FILE AUDIT ---
        let totalMenteeFiles = 0;
        let totalReviewFiles = 0;
        // ------------------------------------

        // 1. Calculate Individual Group Scores & Panelist Counts
        const groupsWithScores = groups.map((group: any) => {
          // --- Role Detection Logic ---
          const p = group.panelists || {};
          const panelistString = `${p.chair || ''} ${p.internal || ''} ${p.external || ''}`.toLowerCase();
          const isPanelist = myNameKeywords.some(keyword => panelistString.includes(keyword));

          if (isPanelist) {
             panelistCount++;
          }

          // --- Score Logic ---
          const groupId = group._id.toString();
          const groupProgress = progress.filter((p: any) => p.groupId === groupId);
          let score = 0;
          groupProgress.forEach((p: any) => {
            if (p.status === 'Done') score += 10;
            else if (p.status === 'In Progress') score += 5;
          });

          // --- RETURN ENRICHED OBJECT FOR NEXT STEPS ---
          return { ...group, totalScore: score, isPanelistGroup: isPanelist };
        });

        // Mentoring is Total - Panelist
        const mentoring = groups.length - panelistCount;

        // 2. Sort for Leaderboard
        const sorted = groupsWithScores.sort((a: any, b: any) => {
          if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
          return a.groupName.localeCompare(b.groupName);
        });
        setTopGroups(sorted.slice(0, 4)); 

        // 3. Process Schedule
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

        // 4. Calculate Max Score & Task Breakdowns
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

        // 5. Process Files (WITH AUDIT)
        let allFiles: any[] = [];
        let groupsUploadedCount = 0;
        
        groupsWithScores.forEach((g: any) => {
            if (g.files && g.files.length > 0) {
                groupsUploadedCount++;
                const fileCount = g.files.length;

                // --- COUNT FILES BASED ON ROLE ---
                if (g.isPanelistGroup) {
                    totalReviewFiles += fileCount;
                } else {
                    totalMenteeFiles += fileCount;
                }
                // --------------------------------

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
          // --- SET NEW STATS ---
          menteeFilesCount: totalMenteeFiles,
          nonMenteeFilesCount: totalReviewFiles
        });

        // 6. Set Deliverables List
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
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 transition-colors duration-300">
      <IntroAnimation />
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
              JJCP Thesis <span className="text-blue-600"> Mentoring Hub 5.0</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               Welcome back, {currentUser}. Here is your daily briefing.
            </p>
          </div>
          <div className="hidden md:block text-right">
             <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">System Status</p>
             <p className="text-sm font-bold text-slate-700 dark:text-slate-300">All Systems Operational</p>
          </div>
        </header>

        {/* --- HERO STATS GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
          
          {/* 1. INNOVATIVE SPLIT CARD (MENTOR vs PANEL) */}
          <Link href="/groups" className="md:col-span-1 block group h-full">
            <div className="relative h-full bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                
                <div className="h-full flex flex-col">
                   {/* Top Half: Mentoring */}
                   <div className="flex-1 p-5 pb-2 border-b border-dashed border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-start mb-1">
                         <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <GraduationCap size={18} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Mentoring</span>
                         </div>
                      </div>
                      <div className="flex items-baseline gap-1">
                         <span className="text-3xl font-black text-slate-800 dark:text-white">
                            {loading ? "-" : stats.mentoringCount}
                         </span>
                         <span className="text-xs font-medium text-slate-400">groups</span>
                      </div>
                   </div>

                   {/* Bottom Half: Paneling */}
                   <div className="flex-1 p-5 pt-3 bg-slate-50/50 dark:bg-slate-800/30 group-hover:bg-blue-50/30 dark:group-hover:bg-slate-800 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                         <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400">
                            <Gavel size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Panelist</span>
                         </div>
                      </div>
                      <div className="flex items-baseline gap-1">
                         <span className="text-3xl font-black text-slate-800 dark:text-white">
                            {loading ? "-" : stats.panelingCount}
                         </span>
                         <span className="text-xs font-medium text-slate-400">groups</span>
                      </div>
                   </div>
                </div>
            </div>
          </Link>

          {/* 2. SYNCED SCHEDULES */}
          <Link href="/parser" className="block md:col-span-1 h-full">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-200 hover:border-emerald-200 hover:shadow-md cursor-pointer h-full relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-5 -mt-5"></div>
              
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center">
                    <Calendar size={20} />
                 </div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Synced</p>
              </div>

              <div>
                <p className="text-4xl font-black text-slate-800 dark:text-white">
                    {loading ? "--" : stats.synced}
                </p>
                <p className="text-xs text-slate-500 mt-1">Confirmed Schedules</p>
              </div>
            </div>
          </Link>

          {/* 3. STUDENTS */}
          <Link href="/masterlist" className="block md:col-span-1 h-full">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-200 hover:border-amber-200 hover:shadow-md cursor-pointer h-full relative overflow-hidden flex flex-col justify-between">
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -ml-5 -mb-5"></div>
              
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center">
                    <Users size={20} />
                 </div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Students</p>
              </div>

              <div>
                <p className="text-4xl font-black text-slate-800 dark:text-white">
                    {loading ? "--" : stats.students}
                </p>
                <p className="text-xs text-slate-500 mt-1">Active Researchers</p>
              </div>
            </div>
          </Link>

          {/* 4. TOTAL SCORE PROGRESS */}
          <div className="relative group bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-200 hover:shadow-md cursor-default h-full md:col-span-1">
             <div className="flex flex-col h-full justify-between">
                <div className="flex justify-between items-start">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Score</span>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-black ${isGoalMet ? "text-green-500" : "text-blue-600"}`}>
                           {loading ? "--" : stats.accumulatedScore}
                        </span>
                        <span className="text-xs font-bold text-slate-300">/ {stats.maxPossibleScore}</span>
                      </div>
                   </div>
                   {isGoalMet && <CheckCircle2 className="text-green-500 animate-bounce" size={20} />}
                </div>

                <div className="space-y-2">
                   <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${isGoalMet ? "bg-green-500" : "bg-blue-600"}`}
                        style={{ width: `${loading ? 0 : progressPercentage}%` }}
                      />
                   </div>
                   <div className="flex justify-between text-[9px] font-bold uppercase text-slate-400">
                      <span>Progress</span>
                      <span>{progressPercentage}%</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* --- BENTO GRID CONTENT --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
         {/* CONSULTATION SCHEDULE */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col">
              <div className="p-6 md:p-8 pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                      <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Upcoming Consultations</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Synced from Google Sheets</p>
                  </div>
                </div>
                
                <Link href="/parser" className="bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors">
                   Update <ArrowRight className="w-3 h-3"/>
                </Link>
             </div>

             <div className="flex-1 overflow-y-auto max-h-[550px] p-6 pt-2 space-y-2 custom-scrollbar">
                {loading ? (
                  <div className="text-center py-8 text-slate-400 text-sm animate-pulse">Syncing calendar events...</div>
                ) : consultations.length > 0 ? (
                  consultations.map((consult, idx) => (
                    <div key={idx} className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all gap-3">
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 h-12 w-14 rounded-xl shrink-0 shadow-sm">
                                <span className="text-[9px] font-bold uppercase text-slate-400">{consult.dayDisplay.substring(0,3)}</span>
                                <span className="text-lg font-black leading-none">{consult.nextDate.getDate()}</span>
                            </div>
                            
                            <div>
                              <h3 className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">{consult.groupName}</h3>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                 <span className="flex items-center gap-1"><Clock size={12} className="text-blue-500"/> {consult.timeDisplay}</span>
                                 <span className="hidden sm:inline text-slate-300">•</span>
                                 <span>{consult.adviser}</span>
                              </div>
                            </div>
                        </div>

                        <div className="self-end sm:self-center">
                           <span className="text-[9px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle2 size={10} /> CONFIRMED
                           </span>
                        </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                      <p className="text-slate-400 text-sm mb-2">No schedules synced yet.</p>
                  </div>
                )}
             </div>
          </div>

          {/* RIGHT COLUMN STACK */}
          <div className="flex flex-col gap-6">

            {/* LEADERBOARD CARD */}
            <div className="bg-slate-900 dark:bg-black p-6 rounded-[2.5rem] text-white shadow-xl flex flex-col relative overflow-hidden min-h-[300px]">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full blur-[60px] opacity-40 pointer-events-none -mr-10 -mt-10"></div>

              <div className="flex items-center justify-between mb-6 z-10">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" /> Leaderboard
                </h3>
                <Link href="/leaderboards" className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">View All</Link>
              </div>
              
              <div className="flex-1 flex flex-col gap-2 z-10 overflow-y-auto max-h-[300px] custom-scrollbar pr-2"> 
                {loading ? (
                    <div className="space-y-3 opacity-20 animate-pulse"> 
                        <div className="h-12 w-full bg-white/20 rounded-xl" />
                        <div className="h-12 w-full bg-white/20 rounded-xl" />
                    </div>
                ) : topGroups.length > 0 ? (
                    topGroups.map((group, index) => (
                        <div key={group._id} className="flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors p-3 rounded-2xl border border-white/5 backdrop-blur-sm">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-black shadow-lg
                                    ${index === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-yellow-900' : 
                                      index === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800' : 
                                      index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-orange-900' :
                                      'bg-slate-800 text-slate-400 border border-slate-700'
                                    }`}>
                                    {index + 1}
                                </div>
                                <span className="font-semibold text-sm truncate text-slate-200 max-w-[100px]">
                                    {group.groupName}
                                </span>
                            </div>
                            <span className="font-mono font-bold text-blue-300 text-sm bg-blue-500/20 px-2 py-1 rounded-lg">
                                {group.totalScore}
                            </span>
                        </div>
                    ))
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm">No rankings yet.</div>
                )}
              </div>
            </div>

            {/* UPCOMING DEADLINES */}
            <div className="bg-blue-50/50 dark:bg-slate-900 p-8 rounded-[2.5rem] border border-blue-100 dark:border-slate-800 flex flex-col transition-colors flex-1">
              <h3 className="font-bold text-blue-900 dark:text-blue-400 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Deliverables
              </h3>
              
              <div className="space-y-3 flex-1">
                {loading ? (
                      <p className="text-blue-300 text-xs">Loading...</p>
                ) : deliverables.length > 0 ? (
                    deliverables.map((task, i) => {
                        const [month, day] = formatDate(task.deadline).split(' ');
                        return (
                          <div key={i} className="flex items-center gap-4 bg-white dark:bg-white/5 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-transparent">
                              <div className="flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-xl min-w-[55px]">
                                    <span className="text-[9px] font-bold text-blue-400 uppercase leading-none mb-1">{month}</span>
                                    <span className="text-xl font-black text-blue-600 dark:text-blue-400 leading-none">{day}</span>
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{task.taskName}</span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate uppercase tracking-wider">{task.type}</span>
                              </div>
                          </div>
                        );
                    })
                ) : (
                    <div className="h-full flex items-center justify-center text-blue-300 text-xs">No pending deadlines</div>
                )}
              </div>
              
              <div className="mt-4 text-center">
                <Link href="/deliverables" className="text-[10px] font-bold text-blue-400 uppercase tracking-widest hover:text-blue-600">View Full Calendar</Link>
              </div>
            </div>

          </div>

          {/* BOTTOM ROW: REPOSITORY */}
          <div className="md:col-span-3 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-8 transition-colors">
              <div className="md:w-1/3 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 pb-6 md:pb-0 md:pr-6 flex flex-col">
                
                <Link href="/files" className="inline-block self-start">
                    <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-2xl flex items-center justify-center mb-4 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                      <FolderOpen className="w-6 h-6" />
                    </div>
                </Link>

                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Files Repository</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Recent uploads from your thesis groups.</p>
                
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl font-black text-slate-800 dark:text-white">{stats.groupsWithFiles}</span>
                  <span className="text-xs font-medium text-slate-400">groups contributed</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-8">
                   <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${uploadPercentage}%` }}></div>
                </div>

                {/* --- NEW AUDIT SECTION (Counters) --- */}
                <div className="mt-auto grid grid-cols-2 gap-4">
                    <div className="p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/10">
                        <p className="text-[10px] font-bold uppercase text-indigo-400 tracking-widest mb-1">Mentee Files</p>
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{loading ? '-' : stats.menteeFilesCount}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">Review Files</p>
                        <p className="text-2xl font-black text-slate-600 dark:text-slate-300">{loading ? '-' : stats.nonMenteeFilesCount}</p>
                    </div>
                </div>
                {/* ------------------------------------ */}
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm w-full h-full">
                 <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recent Uploads</h4>
                    <Link href="/files" className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest hover:text-indigo-600">View All</Link>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {loading ? (
                        <p className="text-xs text-slate-400">Loading files...</p>
                     ) : recentFiles.length > 0 ? (
                        recentFiles.map((file, idx) => (
                           <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex flex-col justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                              <div className="flex justify-between items-start mb-4">
                                 <div className="text-indigo-400">
                                    {file.url && (file.url.endsWith('.png') || file.url.endsWith('.jpg')) 
                                      ? <ImageIcon size={20}/> 
                                      : <FileText size={20}/>}
                                 </div>
                                 <span className="text-[9px] font-bold text-slate-400 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg">{formatDate(file.uploadedAt)}</span>
                              </div>
                              <div>
                                 <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate mb-1" title={file.name}>{file.name || "Untitled"}</p>
                                 <p className="text-[10px] text-indigo-500 font-bold truncate bg-indigo-50 dark:bg-indigo-900/30 inline-block px-2 py-0.5 rounded-md">
                                    {file.groupName}
                                 </p>
                              </div>
                           </div>
                        ))
                     ) : (
                        <div className="col-span-3 flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl h-32">No recent files found.</div>
                     )}
                 </div>
              </div>
          </div>

        </div>
      </div>
    </div>
  );
}