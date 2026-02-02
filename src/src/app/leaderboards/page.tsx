'use client'

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Medal, 
  Edit3, 
  LayoutGrid,
  Printer
} from 'lucide-react';
import { getLeaderboardData, updateGroupProgress } from '@/app/actions';
import { recordAuditLog } from "@/app/actions";

// --- TYPES ---
interface Group {
  _id: string;
  groupName: string;
}

interface Task {
  _id: string;
  name: string;
  deadline: string | Date;
  type: 'Internal Deadline' | 'Course Deadline' | 'Others';
}

interface ProgressItem {
  groupId: string;
  taskId: string;
  status: 'Done' | 'In Progress' | 'Not Started';
}

interface GroupWithScore extends Group {
  progressMap: Record<string, string>; 
  totalScore: number;
  rank: number | string;
}

export default function LeaderboardPage() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Raw Data
  const [groups, setGroups] = useState<Group[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [progressData, setProgressData] = useState<ProgressItem[]>([]);
  
  // Computed Data
  const [rankedGroups, setRankedGroups] = useState<GroupWithScore[]>([]);

  // 1. Fetch Data
  useEffect(() => {
    async function load() {
      const data = await getLeaderboardData();
      setGroups(data.groups || []);
      setTasks(data.tasks || []);
      setProgressData(data.progress || []);
      setIsLoading(false);
    }
    load();
  }, []);

  // 2. Calculate Scores & Ranks
  useEffect(() => {
    if (groups.length === 0) return;

    const getPoints = (status: string) => {
      if (status === 'Done') return 100;
      if (status === 'In Progress') return 50;
      return 0;
    };

    const processed = groups.map(group => {
      const groupProgress = progressData.filter(p => p.groupId === group._id);
      const progressMap: Record<string, string> = {};
      let totalPoints = 0;

      tasks.forEach(task => {
        const item = groupProgress.find(p => p.taskId === task._id);
        const status = item ? item.status : 'Not Started';
        progressMap[task._id] = status;
        totalPoints += getPoints(status);
      });

      const meanScore = tasks.length > 0 ? (totalPoints / tasks.length) : 0;

      return {
        ...group,
        progressMap,
        totalScore: meanScore,
        rank: 0 
      };
    });

    processed.sort((a, b) => b.totalScore - a.totalScore);

    let currentRank = 1;
    for (let i = 0; i < processed.length; i++) {
      if (i > 0 && processed[i].totalScore < processed[i-1].totalScore) {
        currentRank = i + 1;
      }
      processed[i].rank = currentRank;
    }

    setRankedGroups(processed);

  }, [groups, tasks, progressData]);


  // 3. Handle Cell Update
  const handleStatusChange = async (groupId: string, taskId: string, newStatus: string) => {
    setProgressData(prev => {
      const existingIndex = prev.findIndex(p => p.groupId === groupId && p.taskId === taskId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], status: newStatus as any };
        return updated;
      } else {
        return [...prev, { groupId, taskId, status: newStatus as any }];
      }
    });
    await updateGroupProgress(groupId, taskId, newStatus);
  };


  // --- VISUAL HELPERS ---
  const getRankStyle = (rank: number) => {
    switch(rank) {
      case 1: return "bg-amber-50 border-amber-200 shadow-amber-100"; 
      case 2: return "bg-slate-50 border-slate-300 shadow-slate-100"; 
      case 3: return "bg-orange-50 border-orange-200 shadow-orange-100"; 
      default: return "bg-white border-slate-100";
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-amber-500 fill-amber-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-slate-400 fill-slate-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-orange-400 fill-orange-400" />;
    return <span className="text-slate-400 font-bold text-lg">#{rank}</span>;
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Done': return 'bg-green-100 text-green-700 border-green-200';
      case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-400 border-slate-200';
    }
  };

  const getTypeBadge = (type: string) => {
    switch(type) {
        case 'Course Deadline': return 'bg-red-100 text-red-700 border-red-200';
        case 'Internal Deadline': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

 return (
    <div className="min-h-screen bg-slate-50/50 p-8 font-sans">
      
      {/* --- FIXED PRINT CSS --- */}
        <style dangerouslySetInnerHTML={{ __html: `
        @media print {
            /* 1. PAPER SETUP */
            @page { 
            size: landscape; 
            margin: 5mm; /* Very small printer margins, we handle the rest in CSS */
            }

            /* 2. HIDE EVERYTHING (Sidebar, Nav, etc.) */
            body > * {
            display: none !important;
            }

            /* 3. RESET HTML/BODY */
            html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            overflow: visible !important;
            background: white !important;
            }

            /* 4. THE MAIN PRINT WRAPPER - The "Left Margin" Fix */
            /* We make this the ONLY visible thing and force it to the left edge */
            #print-content-wrapper {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            
            /* Force it to the top-left corner of the paper, ignoring parent padding */
            top: 0 !important;
            left: 0 !important; 
            margin: 0 !important;
            
            /* Use Viewport Width to ensure it fills the paper, not the container */
            width: 100vw !important; 
            max-width: 100vw !important;
            
            /* Add the requested TOP MARGIN here */
            padding-top: 15mm !important; 
            padding-left: 5mm !important; /* Small buffer from left edge */
            padding-right: 5mm !important;
            
            background: white !important;
            z-index: 9999 !important;
            }

            /* Ensure children of the wrapper are visible */
            #print-content-wrapper * {
            visibility: visible !important;
            }

            /* 5. LEADERBOARD TABLE (Keep this full width) */
            #printable-leaderboard {
            width: 100% !important;
            display: block !important;
            margin-bottom: 30px !important; /* Space between table and legend */
            }

            /* 6. LEGEND TABLE - "Natural" Width Fix */
            #printable-legend {
            /* This makes it only as wide as the text inside */
            width: fit-content !important; 
            min-width: 40% !important; /* Don't let it get TOO small */
            max-width: 100% !important;
            
            display: block !important;
            margin-top: 20px !important;
            
            /* Optional: Add a border so it looks distinct */
            border: 1px solid #eee !important;
            border-radius: 8px !important;
            padding: 10px !important;
            }
            
            /* Ensure the table INSIDE the legend doesn't force 100% either */
            #printable-legend table {
            width: auto !important; 
            }

            /* 7. SCROLL FIXES (Prevent cutting off content) */
            .overflow-y-auto, 
            .overflow-x-auto, 
            div[class*="scroll"] {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            display: block !important;
            }

            /* 8. COSMETICS */
            .no-print, button, nav, aside {
            display: none !important;
            }
            
            /* Improve text contrast for print */
            * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            }
        }
        `}} />

      {/* Header (Hidden in Print) */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <LayoutGrid className="text-blue-600" /> Leaderboard
          </h1>
          <p className="text-slate-500 mt-2">Track thesis group progress and rankings.</p>
        </div>

        <div className="flex items-center gap-3">
           {/* Print Button */}
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Printer size={16} />
            <span>Print Leaderboard</span>
          </button>

           {/* Toggle Edit Mode */}
          <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <span className={`text-sm font-bold ${!isEditMode ? 'text-blue-600' : 'text-slate-400'}`}>View</span>
            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              className={`
                relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none
                ${isEditMode ? 'bg-blue-600' : 'bg-slate-200'}
              `}
            >
              <div className={`
                absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow-md transition-transform duration-300 flex items-center justify-center
                ${isEditMode ? 'translate-x-6' : 'translate-x-0'}
              `}>
                {isEditMode ? <Edit3 size={12} className="text-blue-600" /> : <Trophy size={12} className="text-slate-400" />}
              </div>
            </button>
            <span className={`text-sm font-bold ${isEditMode ? 'text-blue-600' : 'text-slate-400'}`}>Edit</span>
          </div>
        </div>
      </div>

      <div id="print-content-wrapper" className="flex flex-col xl:flex-row gap-6 items-start">
        
        {/* LEFT SIDE: MAIN LEADERBOARD TABLE */}
        <div id="printable-leaderboard" className="flex-1 w-full xl:w-3/4">
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xl bg-white">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-5 font-bold text-slate-500 text-xs uppercase tracking-wider w-16 text-center">Rank</th>
                            <th className="p-5 font-bold text-slate-500 text-xs uppercase tracking-wider min-w-[200px]">Group Name</th>
                            {tasks.map((task, index) => {
                                const d = new Date(task.deadline);
                                const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
                                const dd = String(d.getUTCDate()).padStart(2, '0');
                                const yy = String(d.getUTCFullYear()).slice(-2);
                                const dateStr = `${mm}${dd}${yy}`;

                                return (
                                    <th 
                                        key={task._id} 
                                        title={task.name}
                                        className="p-2 font-bold text-slate-500 text-xs uppercase tracking-wider text-center"
                                    >
                                        <div className="flex flex-col items-center gap-1 print-header-fix">
                                            <span className="text-blue-600 font-extrabold">T{index + 1}</span>
                                            <span className="text-[10px] font-normal text-slate-400 font-mono">{dateStr}</span>
                                        </div>
                                    </th>
                                );
                            })}
                            <th className="p-5 font-bold text-slate-500 text-xs uppercase tracking-wider text-center w-24">Score</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={tasks.length + 3} className="p-8 text-center text-slate-400">Loading leaderboard...</td></tr>
                        ) : rankedGroups.map((group) => (
                            <tr key={group._id} className={`transition-colors ${getRankStyle(group.rank as number)}`}>
                                <td className="p-5 text-center">
                                    <div className="flex justify-center items-center">{getRankIcon(group.rank as number)}</div>
                                </td>
                                <td className="p-5">
                                    <div className="font-bold text-slate-800 text-base mb-1">{group.groupName}</div>
                                    <div className="w-full h-2 bg-black/5 rounded-full overflow-hidden flex items-center mt-2">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${
                                                group.totalScore === 100 ? 'bg-green-500' : 
                                                group.totalScore >= 50 ? 'bg-blue-500' : 'bg-orange-400'
                                            }`}
                                            style={{ width: `${group.totalScore}%` }}
                                        />
                                    </div>
                                </td>
                                {tasks.map(task => {
                                    const status = group.progressMap[task._id] || 'Not Started';
                                    return (
                                        <td key={task._id} className="p-3 text-center">
                                            {isEditMode ? (
                                                <select 
                                                    value={status}
                                                    onChange={(e) => handleStatusChange(group._id, task._id, e.target.value)}
                                                    className={`w-full p-2 rounded-lg text-xs font-bold border-2 focus:outline-none cursor-pointer ${
                                                        status === 'Done' ? 'border-green-200 bg-green-50 text-green-700' : 
                                                        status === 'In Progress' ? 'border-blue-200 bg-blue-50 text-blue-700' : 
                                                        'border-slate-200 bg-slate-50 text-slate-500'
                                                    }`}
                                                >
                                                    <option value="Not Started">Not Started</option>
                                                    <option value="In Progress">In Progress</option>
                                                    <option value="Done">Done</option>
                                                </select>
                                            ) : (
                                                <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(status)}`}>
                                                    {status}
                                                </span>
                                            )}
                                        </td>
                                    );
                                })}
                                <td className="p-5 text-center">
                                    <div className="text-lg font-black text-slate-700">{Math.round(group.totalScore)}</div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
             {/* Legend Footer for Print/View */}
            <div className="mt-6 flex gap-6 text-xs text-slate-500 justify-center">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div><span>Done (100 pts)</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div><span>In Progress (50 pts)</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded"></div><span>Not Started (0 pts)</span></div>
            </div>
        </div>

        {/* RIGHT SIDE: LEGEND TABLE (Visible on Print Page 2) */}
        <div id="printable-legend" className="w-full xl:w-1/4">
             <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden sticky top-8">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Task Legend</h2>
                </div>
                {/* The class overflow-y-auto is what caused the blank print; the CSS above fixes it */}
                <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase">ID</th>
                                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase">Task Name</th>
                                <th className="p-3 text-[10px] font-bold text-slate-400 uppercase text-right">Type</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tasks.map((task, index) => (
                                <tr key={task._id} className="hover:bg-slate-50">
                                    <td className="p-3 text-xs font-extrabold text-blue-600 align-top">T{index + 1}</td>
                                    <td className="p-3 text-xs font-medium text-slate-600 align-top">{task.name}</td>
                                    <td className="p-3 align-top text-right">
                                        <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold border ${getTypeBadge(task.type)}`}>
                                            {task.type === 'Internal Deadline' ? 'Internal' : task.type === 'Course Deadline' ? 'Course' : 'Other'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
        </div>

      </div>
    </div>
  );
}