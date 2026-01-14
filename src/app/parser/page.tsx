"use client";
import React, { useState, useEffect } from 'react';
import { 
  Save, Trash2, Edit3, Database, CheckCircle2, 
  Calendar, Users, Crown, Plus, X, CloudUpload, Loader2,
  UserCircle
} from 'lucide-react';

import { 
  getGroupsFromDB, 
  updateGroupSchedule, 
  saveGroupToDB, 
  deleteGroup, 
} from "@/app/actions";

// 1. STATIC CONSTANTS (Keep outside the component)
const DAYS = ['M', 'T', 'W', 'H', 'F', 'S']; 
const DAY_LABELS: Record<string, string> = { 
  'M': 'Mon', 'T': 'Tue', 'W': 'Wed', 'H': 'Thu', 'F': 'Fri', 'S': 'Sat' 
};

// This helper ensures the member name matches the key in your MongoDB
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

// 2. MAIN COMPONENT (Unified)
export default function CombinedGroupsAndParser() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("manual");
  const [isSaving, setIsSaving] = useState(false);
  const [members, setMembers] = useState<Member[]>([
    { id: 1, name: "Member 1", raw: "", parsed: [] }, 
    { id: 2, name: "Member 2", raw: "", parsed: [] },
    { id: 3, name: "Member 3", raw: "", parsed: [] },
    { id: 4, name: "Member 4", raw: "", parsed: [] },
  ]);

  // --- DATABASE HELPERS ---
  const loadGroups = async () => {
    setLoading(true);
    const data = await getGroupsFromDB();
    setGroups(data);
    setLoading(false);
  };

  useEffect(() => { loadGroups(); }, []);

  const handleGroupSelect = (groupId: string) => {
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
          // Use sanitizeKey to match MongoDB structure
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
  };

  const timeToMin = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const handleParse = (index: number, text: string) => {
    const lines = text.trim().split('\n');
    const schedule: ScheduleItem[] = [];
    lines.forEach(line => {
      const parts = line.split(/\t| {2,}/).map(p => p.trim());
      if (parts.length >= 6 && parts[0] !== "Courses") {
        const dayArr = parts[4].split(' / ');
        const timeArr = parts[5].split(' / ');
        dayArr.forEach((day, i) => {
          const timeRange = timeArr[i] || timeArr[0];
          const [start, end] = timeRange.split('-');
          if (start && end) {
            schedule.push({ 
              day: day.trim(), 
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
        // We sanitize the key so "QUE, ADRIAN DOMINIC T." becomes "QUE, ADRIAN DOMINIC T"
        // matching your MongoDB document
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

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-20 p-10 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <h1 className="text-6xl font-medium tracking-tight">
          Schedule <span className="text-slate-300 italic">Parser</span>
        </h1>

        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={handleSaveSchedules}
            disabled={isSaving || selectedGroupId === "manual"}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white px-6 py-4 rounded-3xl font-bold transition-all shadow-lg"
          >
            {isSaving ? <Loader2 className="animate-spin" size={20}/> : <CloudUpload size={20} />}
            {isSaving ? "Syncing..." : "Sync to Database"}
          </button>

          <div className="bg-white p-2 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3 pr-6">
            <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl"><Database size={20} /></div>
            <div className="flex flex-col">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Target Group</label>
              <select 
                value={selectedGroupId}
                onChange={(e) => handleGroupSelect(e.target.value)}
                className="bg-transparent font-bold text-sm outline-none cursor-pointer text-slate-900"
              >
                <option value="manual">Manual Entry</option>
                {groups.map((g) => <option key={g._id} value={g._id}>{g.groupName}</option>)}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* TABS & TEXTAREA */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
          {members.map((m, i) => (
            <button 
              key={i} 
              onClick={() => setActiveTabIndex(i)} 
              className={`flex-1 min-w-[120px] py-6 font-bold text-xs transition-all ${activeTabIndex === i ? 'bg-white text-blue-600 shadow-[0_-4px_0_inset_#2563eb]' : 'text-slate-400'}`}
            >
              {m.name.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="p-10 space-y-4">
          <textarea 
            value={members[activeTabIndex]?.raw || ""}
            onChange={(e) => handleParse(activeTabIndex, e.target.value)}
            placeholder={`Paste SOLAR schedule text here...`}
            className="w-full h-40 bg-slate-50 border border-slate-100 rounded-3xl p-8 font-mono text-sm outline-none focus:border-blue-500/20 shadow-inner"
          />
        </div>
      </div>

      {/* HEATMAP */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex items-center gap-3">
          <Calendar className="text-blue-600" size={20} />
          <h2 className="font-bold text-slate-800 tracking-tight">Group Availability Heatmap</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 w-24 text-center">Time</th>
                {DAYS.map(d => <th key={d} className="p-6 font-bold text-slate-800 text-lg">{DAY_LABELS[d]}</th>)}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map(time => (
                <tr key={time} className="border-t border-slate-50 group">
                  <td className="p-4 text-xs font-mono text-slate-400 text-center border-r border-slate-100">{time}</td>
                  {DAYS.map(day => {
                    const busy = getBusyMembers(day, time);
                    const isFree = busy.length === 0;
                    return (
                      <td key={day} className="p-1 h-16">
                        {isFree ? (
                          <div className="w-full h-full rounded-xl border border-dashed border-slate-100" />
                        ) : (
                          <div className="w-full h-full rounded-xl bg-blue-600/5 flex items-center justify-center gap-1">
                            {busy.map((m) => <div key={m.id} title={m.name} className="h-8 w-1.5 bg-blue-400 rounded-full" />)}
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
    </div>
  );
}