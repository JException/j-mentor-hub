"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, Calendar, Users, 
  CloudUpload, Loader2, ArrowLeft,
  ChevronRight, Clock, ShieldAlert,
  Star, Sparkles, CheckCircle2 
} from 'lucide-react';

import { 
  getGroupsFromDB, 
  updateGroupSchedule, 
} from "../actions";

// --- CONSTANTS ---
const DAYS = ['M', 'T', 'W', 'H', 'F', 'S']; 
const DAY_LABELS: Record<string, string> = { 
  'M': 'Mon', 'T': 'Tue', 'W': 'Wed', 'H': 'Thu', 'F': 'Fri', 'S': 'Sat' 
};

const DAY_TO_CODE: Record<string, string> = {
  'Monday': 'M', 'Tuesday': 'T', 'Wednesday': 'W', 'Thursday': 'H', 'Friday': 'F', 'Saturday': 'S'
};

const DAY_ORDER: Record<string, number> = {
  'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 7
};

// --- STRICT SANITIZER ---
const sanitizeKey = (key: string) => {
  if (!key) return "";
  return key
    .toLowerCase()         // Force lowercase
    .replace(/\./g, ' ')   // Replace dots with spaces
    .replace(/\s+/g, ' ')  // Collapse multiple spaces into one
    .trim();               // Remove leading/trailing whitespace
};

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
  venue: string;
}

interface Member {
  id: number;
  name: string;
  raw: string;
  parsed: ScheduleItem[];
}

export default function ScheduleManager() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'dashboard' | 'editor'>('dashboard');
  
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

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

  const minToDisplay = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

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

  // --- UPGRADED MATCHING LOGIC ---
  const normalizeForMatch = (str: string) => {
    if (!str) return "";
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

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

      const smartDbMap: Record<string, any> = {};
      
      if (group.schedules) {
        Object.keys(group.schedules).forEach(dbKey => {
          const simplifiedKey = normalizeForMatch(dbKey);
          smartDbMap[simplifiedKey] = group.schedules[dbKey];
        });
      }

      const groupMembers = group.members
        .filter((name: string) => name && name.trim() !== "")
        .map((name: string, i: number) => {
          
          const simplifiedName = normalizeForMatch(name);
          const savedData = smartDbMap[simplifiedName];

          return {
            id: i + 1,
            name: name,
            raw: savedData?.raw || "",
            parsed: savedData?.parsed || []
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
        const venueArr = (parts[6] || "").split(' / ');

        dayArr.forEach((dayRaw, i) => { 
          let day = dayRaw.trim();
          if (day === "TH" || day === "Th") day = "H"; 
          
          const timeRange = timeArr[i] || timeArr[0]; 
          const venue = venueArr[i] || venueArr[0] || "TBA"; 
          
          const [start, end] = timeRange.split('-');
          
          if (start && end) {
            schedule.push({ 
              day: day, 
              start: timeToMin(start), 
              end: timeToMin(end), 
              title: parts[1],
              venue: venue 
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
        await loadGroups();
        alert("Schedules synced with MongoDB!");
      } else {
        alert("Error saving: " + (result.error || "Unknown"));
      }
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to sync with Database.");
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

  const alternateSlots = useMemo(() => {
    if (viewMode !== 'editor') return {};

    const options: Record<string, string[]> = {};
    const otherGroups = groups.filter(g => g._id !== selectedGroupId);

    const isUserBusy = (day: string, timeVal: number) => {
      if (day === 'T' || day === 'F') return true;
      if ((day === 'M' || day === 'H') && timeVal >= 420 && timeVal < 900) return true;
      if (day === 'W' || day === 'S') {
        if (timeVal >= 540 && timeVal < 780) return true;
        if (timeVal >= 1020 && timeVal < 1140) return true;
      }
      return false;
    };
    
    const isOtherGroupBusy = (day: string, timeVal: number) => {
      return otherGroups.some(g => {
        if (!g.consultationDay || !g.consultationTime) return false;
        if (DAY_TO_CODE[g.consultationDay] !== day) return false;
        const gStart = parseTimeValue(g.consultationTime);
        return timeVal >= gStart && timeVal < (gStart + 60);
      });
    };

    DAYS.forEach(day => {
      const validSlots: string[] = [];
      for (let i = 0; i < TIME_SLOTS.length - 1; i++) {
        const t1Str = TIME_SLOTS[i];
        const t2Str = TIME_SLOTS[i+1];
        const t1Val = timeToMin(t1Str);
        const t2Val = timeToMin(t2Str);

        if (isUserBusy(day, t1Val) || isUserBusy(day, t2Val)) continue;
        if (isOtherGroupBusy(day, t1Val) || isOtherGroupBusy(day, t2Val)) continue;

        const busy1 = getBusyMembers(day, t1Str);
        const busy2 = getBusyMembers(day, t2Str);
        
        if (busy1.length === 0 && busy2.length === 0) {
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

  const currentGroup = groups.find(g => g._id === selectedGroupId);
  const currentGroupName = selectedGroupId === "manual" ? "Manual Entry" : currentGroup?.groupName || "Unknown Group";
  const consultationDayCode = currentGroup ? DAY_TO_CODE[currentGroup.consultationDay] : null;
  const consultationTime24 = currentGroup ? convertDBTimeToHeatmap(currentGroup.consultationTime) : null;

  return (
  <div className="min-h-screen bg-slate-50 dark:bg-[#030712] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] p-4 md:p-10 animate-in fade-in duration-700 transition-colors">
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ============================== */}
      {/* DASHBOARD VIEW          */}
      {/* ============================== */}
      {viewMode === 'dashboard' && (
        <>
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-slate-900 dark:text-white">
                Consultation <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 italic font-semibold">Hub</span>
              </h1>
              <p className="text-slate-400 dark:text-slate-400 mt-2 font-medium">
                Select a group to view availability heatmap
              </p>
            </div>
            <button 
              onClick={() => enterGroupEditor("manual")}
              aria-label="Open Manual Parser"
              className="bg-white dark:bg-white/5 backdrop-blur-md hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-white/10 px-6 py-3 rounded-full font-bold transition-all text-sm flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <Clock size={16} aria-hidden="true" className="text-indigo-500" />
              Open Manual Parser
            </button>
          </header>

          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-400 gap-2" role="status">
              <Loader2 className="animate-spin text-indigo-500" aria-hidden="true" /> 
              <span>Loading groups...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group, index) => {
                const hasSchedule = group.consultationDay && group.consultationTime;
                const scheduleText = hasSchedule 
                  ? `${group.consultationDay} @ ${group.consultationTime}`
                  : "Schedule Unset";
                
                // Dynamic styling logic
                const isEven = (index + (group.groupName?.length || 0)) % 2 === 0;
                
                const hoverColorClass = isEven 
                  ? 'hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-500/40 dark:hover:shadow-[0_0_30px_rgba(99,102,241,0.1)]' 
                  : 'hover:bg-purple-50/50 dark:hover:bg-purple-900/20 hover:border-purple-200 dark:hover:border-purple-500/40 dark:hover:shadow-[0_0_30px_rgba(168,85,247,0.1)]';
                
                const badgeColorClass = hasSchedule 
                  ? (isEven 
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30' 
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30')
                  : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-400 dark:border-white/10';
                
                const numberColorClass = isEven 
                  ? 'text-indigo-50 dark:text-white/[0.02] group-hover:text-indigo-100 dark:group-hover:text-indigo-500/10'
                  : 'text-purple-50 dark:text-white/[0.02] group-hover:text-purple-100 dark:group-hover:text-purple-500/10';

                return (
                  <div 
                    key={group._id}
                    onClick={() => enterGroupEditor(group._id)} 
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && enterGroupEditor(group._id)}
                    className={`group bg-white dark:bg-white/[0.03] backdrop-blur-xl p-6 rounded-[30px] border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl ${hoverColorClass} hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500/50`}
                  >
                    <div className={`absolute -bottom-6 -right-4 font-black text-9xl ${numberColorClass} transition-colors select-none`} aria-hidden="true">
                      {index + 1}
                    </div>
                    
                    <div className="relative z-10">
                      <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full mb-4 truncate max-w-full border border-transparent ${badgeColorClass}`}>
                        {scheduleText}
                      </span>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 line-clamp-1 pr-8">
                        {group.groupName}
                      </h3>
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-400 text-sm">
                        <Users size={14} aria-hidden="true" />
                        <span>{group.members?.filter((m: any) => m).length || 0} Members</span>
                      </div>
                      <div className="mt-6 flex items-center text-slate-400 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-bold text-sm gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0 duration-300">
                        View Schedule <ChevronRight size={16} aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty State */}
              {groups.length === 0 && (
                 <div className="col-span-full py-20 text-center text-slate-400 flex flex-col items-center gap-4">
                    <ShieldAlert size={48} className="opacity-20" aria-hidden="true" />
                    <p>No groups found in the database.</p>
                 </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ============================== */}
      {/* EDITOR VIEW           */}
      {/* ============================== */}
      {viewMode === 'editor' && (
        <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
          
          <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <button 
                onClick={handleBackToDashboard}
                aria-label="Back to Dashboard"
                className="bg-white dark:bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
              </button>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
                  {currentGroupName}
                </h2>
                <p className="text-slate-400 text-sm md:text-base flex items-center gap-2 mt-1">
                  <Database size={14} aria-hidden="true" className={selectedGroupId === "manual" ? "text-amber-500" : "text-emerald-500"} />
                  {selectedGroupId === "manual" ? "Local Only" : "Synced with Database"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
               <button 
                onClick={handleSaveSchedules}
                disabled={isSaving || selectedGroupId === "manual"}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-200 disabled:to-slate-200 dark:disabled:from-slate-800 dark:disabled:to-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white px-6 py-3 md:py-4 rounded-3xl font-bold transition-all shadow-[0_4px_20px_-4px_rgba(99,102,241,0.5)] hover:shadow-[0_8px_25px_-4px_rgba(99,102,241,0.6)] disabled:shadow-none text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-[#030712]"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} aria-hidden="true" /> : <CloudUpload size={20} aria-hidden="true" />}
                {isSaving ? "Syncing..." : "Save Schedule"}
              </button>
            </div>
          </header>

          {/* Member Tabs & Parser Input */}
          <section className="bg-white dark:bg-[#0B101D]/80 dark:backdrop-blur-xl rounded-[30px] md:rounded-[40px] border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden transition-colors">
            <div className="flex w-full border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 overflow-x-auto scrollbar-hide" role="tablist">
              {members.map((m, i) => (
                <button 
                  key={i} 
                  role="tab"
                  aria-selected={activeTabIndex === i}
                  aria-controls={`panel-${i}`}
                  onClick={() => setActiveTabIndex(i)} 
                  className={`flex-1 min-w-[120px] px-2 py-4 md:py-6 font-bold text-xs md:text-sm transition-all whitespace-nowrap text-center focus:outline-none relative ${
                    activeTabIndex === i 
                      ? 'bg-white dark:bg-transparent text-indigo-600 dark:text-indigo-400' 
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                  }`}
                >
                  {m.name.toUpperCase()}
                  {/* Glowing active indicator */}
                  {activeTabIndex === i && (
                     <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_-2px_10px_rgba(99,102,241,0.5)]" />
                  )}
                </button>
              ))}
            </div>
            
            <div className="p-4 md:p-8" id={`panel-${activeTabIndex}`} role="tabpanel">
              <textarea 
                value={members[activeTabIndex]?.raw || ""}
                onChange={(e) => handleParse(activeTabIndex, e.target.value)}
                placeholder={`Paste ${members[activeTabIndex]?.name}'s SOLAR schedule text here...`}
                aria-label={`Schedule text for ${members[activeTabIndex]?.name}`}
                className="w-full h-40 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-2xl p-4 md:p-6 font-mono text-xs md:text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
              <p className="text-center text-[10px] text-slate-300 dark:text-slate-500 mt-3 font-medium uppercase tracking-widest">
                Copy from Student Portal • Paste Above
              </p>
            </div>
          </section>

          {/* Availability Heatmap */}
          <section className="bg-white dark:bg-[#0B101D]/80 dark:backdrop-blur-xl rounded-[30px] md:rounded-[40px] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden transition-colors">
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-white/10 bg-slate-50/30 dark:bg-white/5 flex flex-wrap items-center gap-3">
              <Calendar className="text-indigo-600 dark:text-indigo-400" size={20} aria-hidden="true" />
              <h2 className="font-bold text-slate-800 dark:text-slate-100 tracking-tight">Availability Heatmap</h2>
              
              {consultationTime24 && (
                 <span className="ml-auto text-xs bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 px-3 py-1 rounded-full font-bold flex items-center gap-1 border border-amber-200 dark:border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                   <Star size={12} fill="currentColor" aria-hidden="true" />
                   Consultation: {DAY_LABELS[consultationDayCode || '']} @ {consultationTime24}
                 </span>
              )}
            </div>
            
            <div className="overflow-x-auto relative">
              <table className="w-full border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-black/20">
                    <th className="sticky left-0 z-10 bg-slate-50 dark:bg-[#0B101D] p-4 md:p-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-r border-slate-100 dark:border-white/10 w-16 md:w-24 text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]">
                      Time
                    </th>
                    {DAYS.map(d => (
                      <th key={d} scope="col" className="p-4 md:p-6 font-bold text-slate-800 dark:text-slate-200 text-sm md:text-lg min-w-[80px]">
                        {DAY_LABELS[d]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map(time => (
                    <tr key={time} className="border-t border-slate-50 dark:border-white/5 group">
                      <td className="sticky left-0 z-10 bg-white dark:bg-[#0B101D] p-3 md:p-4 text-[10px] md:text-xs font-mono text-slate-400 dark:text-slate-500 text-center border-r border-slate-100 dark:border-white/10 font-bold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)] group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                        {time}
                      </td>
                      {DAYS.map(day => {
                        const busy = getBusyMembers(day, time);
                        const isFree = busy.length === 0;
                        const isConsultationSlot = (day === consultationDayCode) && (time === consultationTime24);

                        return (
                          <td key={day} className="p-1 h-12 md:h-16 relative">
                            {isConsultationSlot && (
                              <div className="absolute inset-0 z-20 border-2 border-amber-400 dark:border-amber-500/80 bg-amber-100/50 dark:bg-amber-500/10 rounded-lg md:rounded-xl pointer-events-none flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                                <Star size={16} className="text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" fill="currentColor" />
                              </div>
                            )}
                            {isFree ? (
                              <div className={`w-full h-full rounded-lg md:rounded-xl border border-dashed border-slate-100 dark:border-white/10 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10 transition-colors ${isConsultationSlot ? 'opacity-50' : ''}`} />
                            ) : (
                              <div className={`w-full h-full rounded-lg md:rounded-xl bg-indigo-600/5 dark:bg-indigo-500/20 flex items-center justify-center gap-1 overflow-hidden px-1 ${isConsultationSlot ? 'ring-2 ring-amber-400' : ''}`}>
                                {busy.map((m) => (
                                  <div key={m.id} title={m.name} className="h-4 md:h-8 w-1 md:w-1.5 bg-indigo-400 dark:bg-indigo-400 rounded-full shadow-[0_0_5px_rgba(129,140,248,0.5)]" />
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
          </section>

          {/* Alternative Schedules */}
          <section className="bg-slate-900 dark:bg-black/40 rounded-[30px] md:rounded-[40px] border border-slate-800 dark:border-white/10 shadow-2xl overflow-hidden text-slate-100 backdrop-blur-xl">
             <div className="p-6 md:p-8 border-b border-slate-800 dark:border-white/10 flex items-center gap-3 bg-slate-800/50 dark:bg-white/5">
               <Sparkles className="text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" size={20} aria-hidden="true" />
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
                      if (!slots || slots.length === 0) return null;
                      
                      return (
                         <div key={day} className="bg-slate-800/50 dark:bg-white/5 rounded-2xl p-4 border border-slate-700/50 dark:border-white/5 hover:border-indigo-500/30 transition-colors">
                            <div className="flex items-center gap-2 mb-3">
                               <span className="text-xl font-bold text-slate-200">{DAY_LABELS[day]}</span>
                               <span className="text-xs bg-slate-700 dark:bg-white/10 text-slate-300 dark:text-slate-300 px-2 py-0.5 rounded-full border border-slate-600 dark:border-white/10">
                                 {slots.length} {slots.length === 1 ? 'option' : 'options'}
                               </span>
                            </div>
                            <div className="space-y-2">
                               {slots.map((slot, idx) => (
                                  <div key={idx} className="text-sm font-mono text-emerald-400 flex items-center gap-2 bg-slate-950/50 dark:bg-black/40 p-2 rounded-lg border border-slate-800 dark:border-white/5 group hover:border-emerald-500/30 transition-colors">
                                     <CheckCircle2 size={12} className="group-hover:drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]" aria-hidden="true" />
                                     {slot}
                                  </div>
                               ))}
                            </div>
                         </div>
                      );
                   })
                )}
             </div>
          </section>

        </div>
      )}
    </div>
  </div>
  );
}