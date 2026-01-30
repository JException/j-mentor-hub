"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, Calendar, Users, 
  CloudUpload, Loader2, ArrowLeft,
  ChevronRight, Clock, ShieldAlert,
  Star, Sparkles, CheckCircle2 // Added icons
} from 'lucide-react';

import { 
  getGroupsFromDB, 
  updateGroupSchedule, 
} from "@/app/actions";

// --- CONSTANTS ---
const DAYS = ['M', 'T', 'W', 'H', 'F', 'S']; 
const DAY_LABELS: Record<string, string> = { 
  'M': 'Mon', 'T': 'Tue', 'W': 'Wed', 'H': 'Thu', 'F': 'Fri', 'S': 'Sat' 
};

// Helper to map Full Day Name (DB) -> Code (Heatmap)
const DAY_TO_CODE: Record<string, string> = {
  'Monday': 'M', 'Tuesday': 'T', 'Wednesday': 'W', 'Thursday': 'H', 'Friday': 'F', 'Saturday': 'S'
};

// Helper to sort days
const DAY_ORDER: Record<string, number> = {
  'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 7
};

const sanitizeKey = (key: string) => key.replace(/\./g, ' ').trim();

const TIME_SLOTS = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7; 
  const min = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${min}`;
});

interface ScheduleItem {
  day: string;
  start: number;
  end: number;
  title: string;
}

interface Member {
  id: number;
  name: string;
  raw: string;
  parsed: ScheduleItem[];
}

export default function ScheduleManager() {
  // State
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'dashboard' | 'editor'>('dashboard');
  
  // Editor State
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  // --- HELPER: TIME PARSER ---
  const parseTimeValue = (timeStr: string) => {
    if (!timeStr) return 9999; 
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  };

  const timeToMin = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  // Convert 24h string back to 12h for display
  const minToDisplay = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  // --- HELPER: CONVERT 12H (DB) to 24H (Heatmap) ---
  const convertDBTimeToHeatmap = (timeStr: string) => {
    if (!timeStr) return null;
    try {
      const [time, modifier] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (modifier === 'PM' && hours !== 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, '0')}:${minutes === 0 ? '00' : minutes}`;
    } catch (e) {
      return null;
    }
  };

  // --- INITIAL DATA LOAD & SORT ---
  const loadGroups = async () => {
    setLoading(true);
    try {
      const data = await getGroupsFromDB();
      const sortedData = data.sort((a: any, b: any) => {
        const dayA = DAY_ORDER[a.consultationDay] || 99;
        const dayB = DAY_ORDER[b.consultationDay] || 99;
        if (dayA !== dayB) return dayA - dayB;
        const timeA = parseTimeValue(a.consultationTime);
        const timeB = parseTimeValue(b.consultationTime);
        return timeA - timeB;
      });
      setGroups(sortedData);
    } catch (e) {
      console.error("Failed to load groups", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGroups(); }, []);

  // --- HANDLERS ---
  const enterGroupEditor = (groupId: string) => {
    setSelectedGroupId(groupId);
    if (groupId === "manual") {
      setMembers([
        { id: 1, name: "Member 1", raw: "", parsed: [] },
        { id: 2, name: "Member 2", raw: "", parsed: [] },
        { id: 3, name: "Member 3", raw: "", parsed: [] },
        { id: 4, name: "Member 4", raw: "", parsed: [] },
      ]);
    } else {
      const group = groups.find(g => g._id === groupId);
      if (!group) return;
      const groupMembers = group.members
        .filter((name: string) => name.trim() !== "")
        .map((name: string, i: number) => {
          const safeName = sanitizeKey(name);
          return {
            id: i + 1,
            name: name,
            raw: group.schedules?.[safeName]?.raw || "",
            parsed: group.schedules?.[safeName]?.parsed || []
          };
        });
      setMembers(groupMembers);
    }
    setActiveTabIndex(0);
    setViewMode('editor');
  };

  const handleBackToDashboard = () => {
    setViewMode('dashboard');
    setSelectedGroupId("");
  };

  const handleParse = (index: number, text: string) => {
    const lines = text.trim().split('\n');
    const schedule: ScheduleItem[] = [];
    lines.forEach(line => {
      const parts = line.split(/\t| {2,}/).map(p => p.trim());
      if (parts.length >= 6 && parts[0] !== "Courses") {
        const dayArr = parts[4].split(' / ');
        const timeArr = parts[5].split(' / ');
        dayArr.forEach((dayRaw, i) => { 
          let day = dayRaw.trim();
          if (day === "TH" || day === "Th") day = "H"; 
          const timeRange = timeArr[i] || timeArr[0];
          const [start, end] = timeRange.split('-');
          if (start && end) {
            schedule.push({ 
              day: day, 
              start: timeToMin(start), 
              end: timeToMin(end), 
              title: parts[1] 
            });
          }
        });
      }
    });
    const updated = [...members];
    updated[index].raw = text;
    updated[index].parsed = schedule;
    setMembers(updated);
  };

  const handleSaveSchedules = async () => {
    if (selectedGroupId === "manual") return;
    setIsSaving(true);
    try {
      const scheduleData: Record<string, any> = {};
      members.forEach(m => {
        const safeKey = sanitizeKey(m.name);
        scheduleData[safeKey] = { raw: m.raw, parsed: m.parsed };
      });
      const result = await updateGroupSchedule(selectedGroupId, scheduleData);
      if (result.success) {
        alert("Schedules synced with MongoDB!");
        await loadGroups();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getBusyMembers = (day: string, timeStr: string) => {
    const currentTime = timeToMin(timeStr);
    return members.filter(m => 
      m.parsed.some((c) => c.day === day && currentTime >= c.start && currentTime < c.end)
    );
  };

  // --- LOGIC: FIND ALTERNATE SLOTS ---
  const alternateSlots = useMemo(() => {
    if (viewMode !== 'editor') return {};

    const options: Record<string, string[]> = {};
    const otherGroups = groups.filter(g => g._id !== selectedGroupId);

  // 1. Is User Busy? (Personal Constraints)
    const isUserBusy = (day: string, timeVal: number) => {
      // Constraint 1: Whole Tuesday (T) & Whole Friday (F)
      if (day === 'T' || day === 'F') return true;

      // Constraint 2: Monday (M) & Thursday (H) are busy 7 AM - 3 PM
      // 7 AM = 420, 3 PM = 900
      if ((day === 'M' || day === 'H') && timeVal >= 420 && timeVal < 900) return true;

      // Constraint 3: Wednesday (W) & Saturday (S)
      if (day === 'W' || day === 'S') {
        // Busy 9 AM - 1 PM (540 - 780)
        if (timeVal >= 540 && timeVal < 780) return true;
        
        // Busy 5 PM - 7 PM (1020 - 1140)
        if (timeVal >= 1020 && timeVal < 1140) return true;
      }
      
      return false;
    };
    // 2. Is Another Group Booked?
    // We treat other group bookings as occupying a 1-hour block starting at their consultation time
    const isOtherGroupBusy = (day: string, timeVal: number) => {
      return otherGroups.some(g => {
        if (!g.consultationDay || !g.consultationTime) return false;
        if (DAY_TO_CODE[g.consultationDay] !== day) return false;
        
        const gStart = parseTimeValue(g.consultationTime);
        // Assuming other groups take 1 hour. If timeVal falls within [Start, Start + 60)
        return timeVal >= gStart && timeVal < (gStart + 60);
      });
    };

    // 3. Iterate Days and Time Slots
    DAYS.forEach(day => {
      const validSlots: string[] = [];

      for (let i = 0; i < TIME_SLOTS.length - 1; i++) {
        const t1Str = TIME_SLOTS[i];
        const t2Str = TIME_SLOTS[i+1];
        
        const t1Val = timeToMin(t1Str);
        const t2Val = timeToMin(t2Str);

        // Check Condition 1: User Personal Schedule
        if (isUserBusy(day, t1Val) || isUserBusy(day, t2Val)) continue;

        // Check Condition 2: Other Groups
        if (isOtherGroupBusy(day, t1Val) || isOtherGroupBusy(day, t2Val)) continue;

        // Check Condition 3: Current Group Members (Heatmap Availability)
        const busy1 = getBusyMembers(day, t1Str);
        const busy2 = getBusyMembers(day, t2Str);
        
        if (busy1.length === 0 && busy2.length === 0) {
          // Found a 1-hour block!
          // t1Val is start, t2Val is +30min. End time is +60min.
          const endTimeVal = t1Val + 60;
          const displayStr = `${minToDisplay(t1Val)} - ${minToDisplay(endTimeVal)}`;
          validSlots.push(displayStr);
        }
      }
      if (validSlots.length > 0) {
        options[day] = validSlots;
      }
    });

    return options;
  }, [members, groups, selectedGroupId, viewMode]);

  // --- DERIVED STATE ---
  const currentGroup = groups.find(g => g._id === selectedGroupId);
  const currentGroupName = selectedGroupId === "manual" ? "Manual Entry" : currentGroup?.groupName || "Unknown Group";
  
  const consultationDayCode = currentGroup ? DAY_TO_CODE[currentGroup.consultationDay] : null;
  const consultationTime24 = currentGroup ? convertDBTimeToHeatmap(currentGroup.consultationTime) : null;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-10 animate-in fade-in duration-700">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* --- VIEW: DASHBOARD --- */}
        {viewMode === 'dashboard' && (
          <>
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div>
                <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-slate-900">
                  Consultation <span className="text-slate-300 italic">Hub</span>
                </h1>
                <p className="text-slate-400 mt-2 font-medium">Select a group to view availability heatmap</p>
              </div>
              <button 
                onClick={() => enterGroupEditor("manual")}
                className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-6 py-3 rounded-full font-bold transition-all text-sm flex items-center gap-2 shadow-sm"
              >
                <Clock size={16} />
                Open Manual Parser
              </button>
            </header>

            {loading ? (
              <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
                <Loader2 className="animate-spin" /> Loading groups...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map((group, index) => {
                  const hasSchedule = group.consultationDay && group.consultationTime;
                  const scheduleText = hasSchedule 
                    ? `${group.consultationDay} @ ${group.consultationTime}`
                    : "Schedule Unset";
                  const hoverColorClass = (index + group.groupName.length) % 2 === 0 
                    ? 'hover:bg-blue-50/50 hover:border-blue-200' 
                    : 'hover:bg-yellow-50/50 hover:border-yellow-200';
                  const badgeColorClass = hasSchedule 
                    ? ((index + group.groupName.length) % 2 === 0 ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700')
                    : 'bg-slate-100 text-slate-400';
                  const numberColorClass = (index + group.groupName.length) % 2 === 0 
                    ? 'text-blue-100 group-hover:text-blue-200'
                    : 'text-yellow-100 group-hover:text-yellow-200';

                  return (
                    <div 
                      key={group._id}
                      onClick={() => enterGroupEditor(group._id)} 
                      className={`group bg-white p-6 rounded-[30px] border border-slate-200 shadow-sm hover:shadow-xl ${hoverColorClass} hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden`}
                    >
                      <div className={`absolute -bottom-6 -right-4 font-black text-9xl ${numberColorClass} transition-colors select-none`}>
                        {index + 1}
                      </div>
                      <div className="relative z-10">
                        <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full mb-4 truncate max-w-full ${badgeColorClass}`}>
                          {scheduleText}
                        </span>
                        <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-1 pr-8">
                          {group.groupName}
                        </h3>
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <Users size={14} />
                          <span>{group.members.filter((m:string) => m).length} Members</span>
                        </div>
                        <div className="mt-6 flex items-center text-slate-400 group-hover:text-slate-600 font-bold text-sm gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300">
                          View Schedule <ChevronRight size={16} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {groups.length === 0 && (
                   <div className="col-span-full py-20 text-center text-slate-400 flex flex-col items-center gap-4">
                      <ShieldAlert size={48} className="opacity-20" />
                      <p>No groups found in the database.</p>
                   </div>
                )}
              </div>
            )}
          </>
        )}

        {/* --- VIEW: EDITOR (PARSER + HEATMAP) --- */}
        {viewMode === 'editor' && (
          <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
            {/* Header */}
            <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <button 
                  onClick={handleBackToDashboard}
                  className="bg-white p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft size={20} className="text-slate-600" />
                </button>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                    {currentGroupName}
                  </h2>
                  <p className="text-slate-400 text-sm md:text-base flex items-center gap-2 mt-1">
                    <Database size={14} />
                    {selectedGroupId === "manual" ? "Local Only" : "Synced with Database"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <button 
                  onClick={handleSaveSchedules}
                  disabled={isSaving || selectedGroupId === "manual"}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-6 py-3 md:py-4 rounded-3xl font-bold transition-all shadow-lg text-sm md:text-base"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20}/> : <CloudUpload size={20} />}
                  {isSaving ? "Syncing..." : "Save Schedule"}
                </button>
              </div>
            </header>

            {/* Parsing Area */}
            <div className="bg-white rounded-[30px] md:rounded-[40px] border border-slate-200 shadow-xl overflow-hidden">
              <div className="flex w-full border-b border-slate-100 bg-slate-50/50 overflow-x-auto scrollbar-hide">
                {members.map((m, i) => (
                  <button 
                    key={i} 
                    onClick={() => setActiveTabIndex(i)} 
                    className={`flex-1 min-w-[120px] px-2 py-4 md:py-6 font-bold text-xs md:text-sm transition-all whitespace-nowrap text-center ${
                      activeTabIndex === i 
                        ? 'bg-white text-blue-600 shadow-[0_-4px_0_inset_#2563eb]' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {m.name.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="p-4 md:p-8">
                <textarea 
                  value={members[activeTabIndex]?.raw || ""}
                  onChange={(e) => handleParse(activeTabIndex, e.target.value)}
                  placeholder={`Paste ${members[activeTabIndex]?.name}'s SOLAR schedule text here...`}
                  className="w-full h-40 bg-slate-50 border border-slate-100 rounded-2xl p-4 md:p-6 font-mono text-xs md:text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                />
                <p className="text-center text-[10px] text-slate-300 mt-2 font-medium uppercase tracking-widest">
                  Copy from Student Portal • Paste Above
                </p>
              </div>
            </div>

            {/* Heatmap Area */}
            <div className="bg-white rounded-[30px] md:rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden">
              <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/30 flex items-center gap-3">
                <Calendar className="text-blue-600" size={20} />
                <h2 className="font-bold text-slate-800 tracking-tight">Availability Heatmap</h2>
                {consultationTime24 && (
                   <span className="ml-auto text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-bold flex items-center gap-1 border border-amber-200">
                     <Star size={12} fill="currentColor" />
                     Consultation: {DAY_LABELS[consultationDayCode || '']} @ {consultationTime24}
                   </span>
                )}
              </div>
              
              <div className="overflow-x-auto relative">
                <table className="w-full border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="sticky left-0 z-10 bg-slate-50 p-4 md:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 w-16 md:w-24 text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        Time
                      </th>
                      {DAYS.map(d => (
                        <th key={d} className="p-4 md:p-6 font-bold text-slate-800 text-sm md:text-lg min-w-[80px]">
                          {DAY_LABELS[d]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIME_SLOTS.map(time => (
                      <tr key={time} className="border-t border-slate-50 group">
                        <td className="sticky left-0 z-10 bg-white p-3 md:p-4 text-[10px] md:text-xs font-mono text-slate-400 text-center border-r border-slate-100 font-bold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          {time}
                        </td>
                        {DAYS.map(day => {
                          const busy = getBusyMembers(day, time);
                          const isFree = busy.length === 0;
                          const isConsultationSlot = (day === consultationDayCode) && (time === consultationTime24);

                          return (
                            <td key={day} className="p-1 h-12 md:h-16 relative">
                              {isConsultationSlot && (
                                <div className="absolute inset-0 z-20 border-2 border-amber-400 bg-amber-100/50 rounded-lg md:rounded-xl pointer-events-none flex items-center justify-center">
                                  <Star size={16} className="text-amber-500 drop-shadow-sm" fill="currentColor"/>
                                </div>
                              )}
                              {isFree ? (
                                <div className={`w-full h-full rounded-lg md:rounded-xl border border-dashed border-slate-100 hover:bg-green-50/50 transition-colors ${isConsultationSlot ? 'opacity-50' : ''}`} />
                              ) : (
                                <div className={`w-full h-full rounded-lg md:rounded-xl bg-blue-600/5 flex items-center justify-center gap-1 overflow-hidden px-1 ${isConsultationSlot ? 'ring-2 ring-amber-400' : ''}`}>
                                  {busy.map((m) => (
                                    <div key={m.id} title={m.name} className="h-4 md:h-8 w-1 md:w-1.5 bg-blue-400 rounded-full" />
                                  ))}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* --- NEW SECTION: ALTERNATE OPTIONS --- */}
            <div className="bg-slate-900 rounded-[30px] md:rounded-[40px] border border-slate-800 shadow-2xl overflow-hidden text-slate-100">
               <div className="p-6 md:p-8 border-b border-slate-800 flex items-center gap-3">
                 <Sparkles className="text-amber-400" size={20} />
                 <div>
                    <h2 className="font-bold text-white tracking-tight">Other alternative schedules</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Filtered by user classes & other group schedules</p>
                 </div>
               </div>
               <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.keys(alternateSlots).length === 0 ? (
                     <div className="col-span-full py-10 text-center text-slate-500">
                        No 1-hour slots available that match all criteria.
                     </div>
                  ) : (
                    DAYS.map(day => {
                       const slots = alternateSlots[day];
                       if (!slots) return null;
                       return (
                          <div key={day} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                             <div className="flex items-center gap-2 mb-3">
                                <span className="text-xl font-bold text-slate-200">{DAY_LABELS[day]}</span>
                                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{slots.length} options</span>
                             </div>
                             <div className="space-y-2">
                                {slots.map((slot, idx) => (
                                   <div key={idx} className="text-sm font-mono text-emerald-400 flex items-center gap-2 bg-slate-950/30 p-2 rounded-lg border border-slate-800">
                                      <CheckCircle2 size={12} />
                                      {slot}
                                   </div>
                                ))}
                             </div>
                          </div>
                       );
                    })
                  )}
               </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}