"use client";
import React, { useState, useEffect } from 'react';
import { getLeaderboardData, getDeliverablesFromDB } from "@/app/actions"; 
// Added Moon and Sun icons for the switch
import { ArrowRight, Star, Clock, Trophy, Calendar, Users, Moon, Sun, Menu } from 'lucide-react';
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
  const [stats, setStats] = useState({ totalGroups: 0, synced: 0, students: 0, accumulatedScore: 0 });
  const [loading, setLoading] = useState(true);
  
  // --- NIGHT MODE STATE ---
  // Initialize from localStorage if available, otherwise false
  const [isDarkMode, setIsDarkMode] = useState(false);

  // --- EFFECT: HANDLE DARK MODE ---
  useEffect(() => {
    // Check system preference or localStorage on mount
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedMode);
    if (savedMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
    
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        const lbData = await getLeaderboardData();
        const { groups = [], tasks = [], progress = [] } = lbData || {};

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

        const sorted = groupsWithScores.sort((a: any, b: any) => {
          if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
          return a.groupName.localeCompare(b.groupName);
        });

        setTopGroups(sorted.slice(0, 4)); 

        // Sort consultations
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
              adviser: group.adviser || "TBA"
            };
          })
          .filter((item: any) => item !== null && item.nextDate !== null)
          .sort((a: any, b: any) => a.nextDate - b.nextDate); 

        setConsultations(upcomingConsultations);

        const totalSystemScore = groupsWithScores.reduce((acc: number, group: any) => acc + group.totalScore, 0);

        setStats({
          totalGroups: groups.length,
          synced: upcomingConsultations.length, 
          students: groups.reduce((acc: number, g: any) => acc + (g.members?.length || 0), 0),
          accumulatedScore: totalSystemScore
        });

        const tasksData = await getDeliverablesFromDB(); 
        const today = new Date().toISOString().split('T')[0];
        const upcoming = (tasksData || [])
          .filter((t: any) => t.deadline >= today)
          .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
          .slice(0, 3);
          
        setDeliverables(upcoming);

      } catch (e) {
        console.error("Error loading dashboard data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    // Added dark:bg-slate-950 for the main background
    <div className="min-h-screen transition-colors duration-300 dark:bg-slate-950">
      
      {/* RESPONSIVE CONTAINER:
         - changed p-8 to p-4 for mobile, md:p-8 for desktop 
      */}
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            {/* UPDATED TITLE HERE */}
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-slate-800 dark:text-white">
              JJCP Mentorship Hub <span className="text-blue-600">3.0</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-base">
                Welcome back, Sir Pura. Manage your thesis groups.
            </p>
          </div>

          {/* NIGHT MODE TOGGLE BUTTON */}
          <button 
            onClick={toggleDarkMode}
            className="self-start md:self-center flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-yellow-400"/> : <Moon className="w-4 h-4 text-slate-600"/>}
            <span>{isDarkMode ? "Light Mode" : "Night Mode"}</span>
          </button>
        </header>

        {/* STATS */}
        {/* RESPONSIVE GRID: grid-cols-2 is fine for mobile, md:grid-cols-4 for desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: 'Total Groups', value: stats.totalGroups },
            { label: 'Synced Schedules', value: stats.synced },
            { label: 'Students', value: stats.students }, // Shortened label for mobile
            { label: 'Total Score', value: stats.accumulatedScore }
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className={`text-xl md:text-2xl font-black ${i === 3 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-white'}`}>
                  {loading ? "--" : stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* BENTO GRID */}
        {/* RESPONSIVE GRID: grid-cols-1 for mobile, md:grid-cols-3 for desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* CONSULTATION SCHEDULE */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-[30px] md:rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col transition-colors">
             <div className="p-6 md:p-8 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                              <h4 className="font-bold text-slate-700 dark:text-slate-200">{consult.groupName}</h4>
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

          {/* REPOSITORY */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 border-dashed flex flex-col items-center justify-center text-center transition-colors">
            <div className="text-slate-300 dark:text-slate-600 text-3xl mb-2">📁</div>
            <h3 className="font-bold text-slate-800 dark:text-white">Repository</h3>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-tighter">Planned Feature</p>
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