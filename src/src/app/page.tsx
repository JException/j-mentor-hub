"use client";
import React, { useState, useEffect } from 'react';
import { getLeaderboardData, getDeliverablesFromDB } from "@/app/actions"; 
import { 
  ArrowRight, Clock, Trophy, Calendar, Users, Moon, Sun, 
  CheckCircle2, CircleDashed, CheckSquare, FileText, FolderOpen, Image as ImageIcon 
} from 'lucide-react';
import Link from 'next/link';

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
  const [topGroups, setTopGroups] = useState<any[]>([]); 
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]); 
  const [recentFiles, setRecentFiles] = useState<any[]>([]); 

  const [stats, setStats] = useState({ 
    totalGroups: 0, 
    synced: 0, 
    students: 0, 
    accumulatedScore: 0,
    maxPossibleScore: 0,
    tasksDone: 0,        
    tasksOngoing: 0,     
    tasksNotStarted: 0,
    groupsWithFiles: 0,
    // --- NEW COUNTERS ---
    menteeFilesCount: 0,
    nonMenteeFilesCount: 0
  });

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedMode);
    if (savedMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        const lbData = await getLeaderboardData();
        const tasksData = await getDeliverablesFromDB(); 

        const { groups = [], progress = [] } = lbData || {};

        // 1. Calculate Individual Group Scores
        const groupsWithScores = groups.map((group: any) => {
          const groupId = group._id.toString();
          const groupProgress = progress.filter((p: any) => p.groupId === groupId);
          let score = 0;
          groupProgress.forEach((p: any) => {
            if (p.status === 'Done') score += 10;
            else if (p.status === 'In Progress') score += 5;
          });
          return { ...group, totalScore: score };
        });

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

        // 5. Process Files (UPDATED LOGIC)
        let allFiles: any[] = [];
        let groupsUploadedCount = 0;
        
        // Counters for roles
        let menteeFilesTotal = 0;
        let nonMenteeFilesTotal = 0;
        const myNameKeywords = ["Dr. Cruz", "Pura", "Justine", "Jude"].map(n => n.toLowerCase());

        groups.forEach((g: any) => {
            if (g.files && g.files.length > 0) {
                groupsUploadedCount++;
                const fileCount = g.files.length;

                // Determine Role for this group
                const p = g.panelists || {};
                const panelistString = `${p.chair || ''} ${p.internal || ''} ${p.external || ''}`.toLowerCase();
                const isPanelist = myNameKeywords.some(keyword => panelistString.includes(keyword));

                if (isPanelist) {
                    nonMenteeFilesTotal += fileCount;
                } else {
                    menteeFilesTotal += fileCount;
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
          synced: upcomingConsultations.length, 
          students: groups.reduce((acc: number, g: any) => acc + (g.members?.length || 0), 0),
          accumulatedScore: totalSystemScore,
          maxPossibleScore: maxSystemScore,
          tasksDone: countDone,
          tasksOngoing: countOngoing,
          tasksNotStarted: countNotStarted,
          groupsWithFiles: groupsUploadedCount,
          menteeFilesCount: menteeFilesTotal,
          nonMenteeFilesCount: nonMenteeFilesTotal
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
  }, []);

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

  // --- NEW: Check if Goal is Met ---
  const isGoalMet = !loading && stats.maxPossibleScore > 0 && stats.accumulatedScore >= stats.maxPossibleScore;

  return (
    <div className="min-h-screen transition-colors duration-300 dark:bg-slate-950">
      
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-slate-800 dark:text-white">
              JJCP Mentorship Hub <span className="text-blue-600">3.0</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-base">
                Welcome back, Sir Pura. Manage your thesis groups.
            </p>
          </div>
        </header>

        {/* --- STATS GRID (UPDATED WITH LINKS & HOVER EFFECTS) --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          
          {/* Card 1: Groups (Blue Hover) -> Links to /groups */}
          <Link href="/groups" className="block">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-200 hover:bg-blue-50 dark:hover:bg-slate-800 hover:border-blue-200 cursor-pointer h-full">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-blue-500">Total Groups</p>
              <p className="text-xl md:text-2xl font-black text-slate-800 dark:text-white mt-1">
                  {loading ? "--" : stats.totalGroups}
              </p>
            </div>
          </Link>

          {/* Card 2: Synced (Indigo Hover) -> Links to /parser */}
          <Link href="/parser" className="block">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-200 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:border-indigo-200 cursor-pointer h-full">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Synced Schedules</p>
              <p className="text-xl md:text-2xl font-black text-slate-800 dark:text-white mt-1">
                  {loading ? "--" : stats.synced}
              </p>
            </div>
          </Link>

          {/* Card 3: Students (Emerald Hover) -> Links to /masterlist */}
          <Link href="/masterlist" className="block">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-200 hover:bg-emerald-50 dark:hover:bg-slate-800 hover:border-emerald-200 cursor-pointer h-full">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Students</p>
              <p className="text-xl md:text-2xl font-black text-slate-800 dark:text-white mt-1">
                  {loading ? "--" : stats.students}
              </p>
            </div>
          </Link>

          {/* Card 4: TOTAL SCORE (Subtle Hover + Tooltip) */}
          <div className="relative group bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-md cursor-default h-full">
            <div className="flex justify-between items-start">
               <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Score</p>
                    {/* GOAL MET BADGE */}
                    {isGoalMet && (
                        <span className="bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded text-[9px] font-bold animate-pulse">
                            GOAL: MET!
                        </span>
                    )}
                  </div>
                  
                  <div className="flex items-baseline gap-1">
                    {/* DYNAMIC COLOR: Green if met, Blue if not */}
                    <p className={`text-xl md:text-2xl font-black transition-colors ${isGoalMet ? "text-green-500 dark:text-green-400" : "text-blue-600 dark:text-blue-400"}`}>
                        {loading ? "--" : stats.accumulatedScore}
                    </p>
                    <span className="text-xs font-bold text-slate-300 dark:text-slate-600">
                        / {loading ? "--" : stats.maxPossibleScore}
                    </span>
                  </div>
               </div>
            </div>

            {/* PROGRESS BAR (Dynamic Color) */}
            <div className="mt-3 w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
               <div 
                 className={`h-full rounded-full transition-all duration-1000 ease-out ${isGoalMet ? "bg-green-500" : "bg-blue-600"}`}
                 style={{ width: `${loading ? 0 : progressPercentage}%` }}
               />
            </div>

            {/* HOVER TOOLTIP */}
            <div className="absolute top-full right-0 mt-2 w-56 p-4 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 translate-y-2 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
               <div className="font-bold mb-2 border-b border-slate-600 pb-2 uppercase tracking-wider text-[10px]">
                 Overall Progress
               </div>
               <div className="space-y-2">
                 <div className="flex items-center justify-between text-emerald-400">
                   <div className="flex items-center gap-2">
                     <CheckCircle2 size={14} /> <span>Done</span>
                   </div>
                   <span className="font-bold">{stats.tasksDone}</span>
                 </div>
                 <div className="flex items-center justify-between text-amber-400">
                   <div className="flex items-center gap-2">
                     <CheckSquare size={14} /> <span>In Progress</span>
                   </div>
                   <span className="font-bold">{stats.tasksOngoing}</span>
                 </div>
                 <div className="flex items-center justify-between text-slate-400">
                   <div className="flex items-center gap-2">
                     <CircleDashed size={14} /> <span>Not Started</span>
                   </div>
                   <span className="font-bold">{stats.tasksNotStarted}</span>
                 </div>
               </div>
               <div className="absolute -top-1 right-8 w-3 h-3 bg-slate-800 dark:bg-slate-700 transform rotate-45"></div>
            </div>
          </div>

        </div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* CONSULTATION SCHEDULE */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-[30px] md:rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col transition-colors">
              <div className="p-6 md:p-8 pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Consultation Schedule</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Chronological order</p>
                  </div>
                </div>
                
                <Link href="/parser" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors">
                   Schedule Tool <ArrowRight className="w-3 h-3"/>
                </Link>
             </div>

             <div className="flex-1 overflow-y-auto max-h-[300px] p-6 md:p-8 pt-0 space-y-3 custom-scrollbar">
                {loading ? (
                  <div className="text-center py-10 text-slate-400 text-sm">Loading schedules...</div>
                ) : consultations.length > 0 ? (
                  consultations.map((consult, idx) => (
                    <div key={idx} className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all gap-4">
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            <div className="flex flex-col items-center justify-center bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 h-12 w-14 rounded-xl shrink-0">
                                <span className="text-[10px] font-bold uppercase">{consult.dayDisplay.substring(0,3)}</span>
                                <span className="text-lg font-black leading-none">{consult.nextDate.getDate()}</span>
                            </div>
                            
                            <div>
                              <h3 className="font-bold text-slate-700 dark:text-slate-200">{consult.groupName}</h3>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                 <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {consult.timeDisplay}</span>
                                 <span className="hidden sm:inline w-1 h-1 bg-slate-300 rounded-full"></span>
                                 <span>{consult.adviser}</span>
                              </div>
                            </div>
                        </div>

                        <div className="self-end sm:self-center">
                           <span className="text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">CONFIRMED</span>
                        </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                      <p className="text-slate-400 text-sm mb-4">No schedules synced yet.</p>
                      <Link href="/parser" className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm">
                        Run Schedule Parser
                      </Link>
                  </div>
                )}
             </div>
          </div>

          {/* LEADERBOARD CARD */}
          <div className="bg-slate-900 dark:bg-slate-800 p-6 rounded-[30px] md:rounded-[40px] text-white shadow-xl flex flex-col relative overflow-hidden min-h-[350px]">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500 rounded-full blur-[80px] opacity-20 pointer-events-none"></div>

            <div className="flex items-center justify-between mb-6 z-10">
              <h3 className="text-lg font-bold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" /> Leaderboard
              </h3>
              <Link href="/leaderboards" className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest">View All</Link>
            </div>
            
            <div className="flex-1 flex flex-col gap-3 z-10 overflow-y-auto max-h-[400px] custom-scrollbar"> 
              {loading ? (
                  <div className="space-y-3 opacity-20 animate-pulse"> 
                      <div className="h-12 w-full bg-white/20 rounded-xl" />
                      <div className="h-12 w-full bg-white/20 rounded-xl" />
                  </div>
              ) : topGroups.length > 0 ? (
                  topGroups.map((group, index) => (
                      <div key={group._id} className="flex items-center justify-between bg-white/10 p-3 rounded-2xl border border-white/5 backdrop-blur-sm">
                          <div className="flex items-center gap-3 overflow-hidden">
                              <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-black 
                                  ${index === 0 ? 'bg-yellow-400 text-yellow-900' : 
                                    index === 1 ? 'bg-slate-300 text-slate-800' : 
                                    index === 2 ? 'bg-orange-300 text-orange-900' :
                                    'bg-slate-700 text-slate-300'
                                  }`}>
                                  {index + 1}
                              </div>
                              <span className="font-semibold text-sm truncate text-slate-100 max-w-[100px] sm:max-w-[120px]">
                                  {group.groupName}
                              </span>
                          </div>
                          <div className="flex flex-col items-end pl-2">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Score</span>
                              <span className="font-mono font-bold text-blue-300 text-lg leading-none">
                                  {group.totalScore}
                              </span>
                          </div>
                      </div>
                  ))
              ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">No rankings yet.</div>
              )}
            </div>
            <div className="mt-auto pt-4 text-center z-10">
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                Updated as of {loading ? "..." : lastUpdated}
              </p>
            </div>
      
          </div>

          {/* GROUP MANAGER */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
            <div>
              <div className="h-10 w-10 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold mb-2 text-slate-800 dark:text-white">Group Manager</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Manage titles, advisers, and group members.</p>
            </div>
            <Link href="/groups" className="text-blue-600 dark:text-blue-400 font-bold text-sm">View Groups →</Link>
          </div>

          {/* REPOSITORY CARD */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col transition-colors">
             <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                   <FolderOpen className="w-5 h-5 text-indigo-500" /> Files Repository
                </h3>
             </div>
             
             {/* Upload Stats */}
             <div className="mb-4">
                 <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Activity</span>
                    <span className="text-[10px] font-bold text-indigo-500 uppercase">{stats.groupsWithFiles} / {stats.totalGroups} Groups</span>
                 </div>
                 <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${uploadPercentage}%` }}></div>
                 </div>

                 {/* NEW COUNTERS FOR MENTEE/PANEL */}
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-700/50">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Mentee Files</span>
                        <span className="block text-xl font-black text-indigo-500">{loading ? "-" : stats.menteeFilesCount}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-700/50">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Review Files</span>
                        <span className="block text-xl font-black text-slate-600 dark:text-slate-300">{loading ? "-" : stats.nonMenteeFilesCount}</span>
                    </div>
                 </div>
             </div>

             <div className="flex-1 space-y-3">
               {loading ? (
                  <p className="text-xs text-slate-400">Loading files...</p>
               ) : recentFiles.length > 0 ? (
                  recentFiles.map((file, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="mt-0.5 text-slate-400 dark:text-slate-500">
                             {file.url && (file.url.endsWith('.png') || file.url.endsWith('.jpg')) 
                               ? <ImageIcon size={16}/> 
                               : <FileText size={16}/>}
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{file.name || "Untitled File"}</p>
                             <div className="flex justify-between items-center mt-0.5">
                                <span className="text-[10px] text-indigo-500 font-bold truncate max-w-[80px]">{file.groupName}</span>
                                <span className="text-[9px] text-slate-400">{formatDate(file.uploadedAt)}</span>
                             </div>
                          </div>
                      </div>
                  ))
               ) : (
                  <div className="flex flex-col items-center justify-center h-20 text-slate-400">
                      <span className="text-xs">No files uploaded yet</span>
                  </div>
               )}
             </div>

             <div className="mt-4 text-center">
               <Link href="/files" className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest hover:text-indigo-600 dark:hover:text-indigo-400">
                  Open Repository
               </Link>
             </div>
          </div>

          {/* UPCOMING DEADLINES */}
          <div className="bg-blue-50 dark:bg-slate-900 p-8 rounded-[40px] border border-blue-100 dark:border-slate-800 flex flex-col transition-colors">
            <h3 className="font-bold text-blue-900 dark:text-blue-400 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Deliverables
            </h3>
            
            <div className="space-y-3 flex-1">
              {loading ? (
                    <p className="text-blue-300 text-xs">Loading...</p>
              ) : deliverables.length > 0 ? (
                  deliverables.map((task, i) => {
                      const [month, day] = formatDate(task.deadline).split(' ');
                      return (
                        <div key={i} className="flex items-center gap-3 bg-white/60 dark:bg-white/5 p-2.5 rounded-xl transition-colors">
                            <div className="flex flex-col items-center justify-center bg-blue-100 dark:bg-blue-900/50 px-3 py-2 rounded-lg min-w-[50px]">
                                  <span className="text-[10px] font-bold text-blue-400 uppercase leading-none mb-0.5">{month}</span>
                                  <span className="text-xl font-black text-blue-600 dark:text-blue-400 leading-none">{day}</span>
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{task.taskName}</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{task.type}</span>
                            </div>
                        </div>
                      );
                  })
              ) : (
                  <div className="h-full flex items-center justify-center text-blue-300 text-xs">No pending deadlines</div>
              )}
            </div>
            
            <div className="mt-4 text-center">
              <Link href="/deliverables" className="text-[10px] font-bold text-blue-400 uppercase tracking-widest hover:text-blue-600">View Calendar</Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}