"use client";
import React, { useState, useEffect } from 'react';
import { 
  Save, Trash2, Pin, Edit3, X, Users, Crown, 
  GraduationCap, LayoutGrid, CalendarClock, Clock, Laptop, School, Plus, ChevronUp
} from 'lucide-react'; 
import { saveGroupToDB, getGroupsFromDB, deleteGroup, updateGroup, togglePinGroup } from "@/app/actions";
import { useRouter } from 'next/navigation';

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false); // NEW: Controls form visibility
  const router = useRouter();
  const [sortBy, setSortBy] = useState<'newest' | 'alphabetical' | 'group'>('newest');

  // --- CONSTANTS ---
  const SECTION_OPTIONS = [
    "TN31", "TN32", "TN33", "TN34", "TN35", 
    "TN36", "TN37", "TN38", "TN39", "TN310", "TS31"
  ];

  const ADVISER_OPTIONS = [
    "Dr. Beau Gray Habal",
    "Dr. Angelo Arguson",
    "Dr. Hadji Tejuco",
    "Dr. Hazel Patilano",
    "Ms. Elisa Malasaga"
  ];

  // --- NEW: DEFENSE MODE CONSTANTS ---
  const ONLINE_PMS = ["Dr. Angelo Arguson", "Ms. Elisa Malasaga"];
  const F2F_PMS = ["Dr. Hadji Tejuco", "Dr. Beau Gray Habal", "Dr. Hazel Patilano"];

  const DAYS_OPTIONS = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
  ];

  const TIME_OPTIONS = [
    "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", 
    "07:00 PM", "08:00 PM"
  ];

  // --- FORM STATE ---
  interface FormData {
    groupName: string;
    thesisTitle: string;
    members: string[];
    assignPM: string;
    se2Adviser: string;    
    pmAdviser: string;      
    sections: string[];
    consultationDay: string;
    consultationTime: string;
  }

  const [formData, setFormData] = useState<FormData>({
    groupName: '', 
    thesisTitle: '', 
    members: ['', '', '', ''], 
    assignPM: '',
    se2Adviser: '',    
    pmAdviser: '',     
    sections: [],
    consultationDay: '',
    consultationTime: ''
  });

  const loadData = async () => {
    const data = await getGroupsFromDB();
    setGroups(data || []);
  };

  useEffect(() => {
    loadData();
  }, []); 

const handleTogglePin = async (id: string, currentStatus: boolean) => {
    try {
      // 1. Flip the status here
      const newStatus = !currentStatus;
      
      // 2. Call the server action with the NEW status
      const res = await togglePinGroup(id, newStatus);
      
      // 3. Check if server actually succeeded
      if (res) {
        await loadData(); // Reload from DB
        router.refresh(); // Force Next.js to clear cache
      }
    } catch (error) {
      console.error("Pin Error:", error);
    }
  };

 const sortedGroups = [...groups].sort((a, b) => {
    // Pinned always comes first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // Then handle other sorts
    if (sortBy === 'alphabetical') return a.thesisTitle.localeCompare(b.thesisTitle);
    if (sortBy === 'group') return a.groupName.localeCompare(b.groupName);
    
    // Default: Newest
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this group?")) {
      try {
        const res = await deleteGroup(id);
        if (res.success) await loadData();
      } catch (error) {
        console.error("Delete Error:", error);
      }
    }
  };

  const handleEdit = (g: any) => {
    setIsEditing(g._id);
    setShowForm(true); // Auto-open form when editing
    
    // SAFETY CHECK
    let safeSections: string[] = [];
    if (Array.isArray(g.sections)) {
      safeSections = g.sections;
    } else if (typeof g.sections === 'string') {
      // @ts-ignore 
      safeSections = g.sections.split(','); 
    }

    setFormData({
      groupName: g.groupName,
      thesisTitle: g.thesisTitle,
      members: Array.isArray(g.members) 
        ? [...g.members, "", "", "", ""].slice(0, 4) 
        : ['', '', '', ''],
      assignPM: g.assignPM || '',
      se2Adviser: g.se2Adviser || '',
      pmAdviser: g.pmAdviser || '',
      sections: safeSections, 
      consultationDay: g.consultationDay || '', 
      consultationTime: g.consultationTime || '' 
    });

    // Timeout to allow render before scrolling
    setTimeout(() => {
      const element = document.getElementById('form-top');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setIsEditing(null);
    setFormData({
        groupName: '', thesisTitle: '', members: ['', '', '', ''], assignPM: '', 
        se2Adviser: '', pmAdviser: '', sections: [], 
        consultationDay: '', consultationTime: '' 
    });
  };

  const saveGroup = async () => {
    if (!formData.groupName || !formData.thesisTitle) {
      alert("Please fill in Group Name and Thesis Title");
      return;
    }

    setIsSaving(true);
    
    const dataToSave = {
      ...formData,
      members: formData.members.filter(m => m.trim() !== ""),
      createdAt: isEditing ? undefined : new Date().toISOString() 
    };

    try {
      let result = isEditing 
        ? await updateGroup(isEditing, dataToSave) 
        : await saveGroupToDB(dataToSave);

      if (result.success) {
        await loadData();
        handleCloseForm(); // Close form on success
      }
    } catch (error) {
      console.error("Save Error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateMember = (index: number, value: string) => {
    const newMembers = [...formData.members];
    newMembers[index] = value;
    setFormData({ ...formData, members: newMembers });
  };

return (
    <div className="max-w-7xl mx-auto space-y-12 p-6 pb-20">
      
      {/* HEADER SECTION */}
      <header className="px-2">
        <h1 className="text-6xl font-medium tracking-tight text-slate-800">
          Thesis <span className="text-slate-300 italic">Groups</span>
        </h1>
        <p className="text-slate-500 mt-2 font-medium">Manage active mentoring groups, advisers, and sections.</p>
      </header>

      {/* ACTIONS & SORTING ROW */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
        {/* Register Button - Left Side */}
        <div className="w-full md:w-auto">
          {!showForm && (
            <button 
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:shadow-blue-200 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 w-full md:w-auto"
            >
              <Plus size={20} strokeWidth={3} />
              REGISTER NEW GROUP
            </button>
          )}
        </div>

        {/* Sort Dropdown - Right Side */}
        <div className="w-full md:w-auto">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white border border-slate-200 px-6 py-4 rounded-2xl font-bold text-xs outline-none shadow-sm cursor-pointer hover:border-blue-300 transition-all w-full md:w-auto appearance-none"
          >
            <option value="newest">Sort by: Newest</option>
            <option value="alphabetical">Sort by: Title (A-Z)</option>
            <option value="group">Sort by: Group Name</option>
          </select>
        </div>
      </div>

      {/* CONDITIONAL FORM SECTION */}
      {showForm && (
      <section className="bg-white rounded-[40px] border border-slate-200 shadow-xl p-10 space-y-8 animate-in slide-in-from-top-4 duration-300">
        <div className="flex justify-between items-center border-b border-slate-100 pb-6">
          <h2 id="form-top" className="text-2xl font-bold text-slate-800 flex items-center gap-3">
             {isEditing ? <Edit3 className="text-blue-500" /> : <Plus className="text-green-500" />}
             {isEditing ? 'Update Group Details' : 'Register New Group'}
          </h2>
          
          <button 
              onClick={handleCloseForm} 
              className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest"
          >
              <X size={18}/> Close
          </button>
        </div>

        {/* Row 1: Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-5 space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Group Name</label>
            <input 
              className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl outline-none focus:border-blue-500 transition-all font-bold"
              value={formData.groupName}
              onChange={e => setFormData({...formData, groupName: e.target.value})}
              placeholder="e.g. Group Alpha"
            />
          </div>
          <div className="md:col-span-7 space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Thesis Title</label>
            <input 
              className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl outline-none focus:border-blue-500 transition-all font-medium italic"
              value={formData.thesisTitle}
              onChange={e => setFormData({...formData, thesisTitle: e.target.value})}
              placeholder="Thesis Title"
            />
          </div>
        </div>

        {/* --- SECTIONS (Multi-select Tags) --- */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Sections (Select all that apply)
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {Array.isArray(formData.sections) && formData.sections.map((sec) => (
              <span key={sec} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                {sec}
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({...prev, sections: prev.sections.filter(s => s !== sec)}))}
                  className="ml-2 hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {SECTION_OPTIONS.map((option) => {
              const isSelected = Array.isArray(formData.sections) && formData.sections.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFormData(prev => {
                    const current = Array.isArray(prev.sections) ? prev.sections : [];
                    const updated = current.includes(option) ? current.filter(s => s !== option) : [...current, option];
                    return { ...prev, sections: updated };
                  })}
                  className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                    isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {isSelected ? `✓ ${option}` : option}
                </button>
              );
            })}
          </div>
        </div>

        {/* --- ADVISERS & CONSULTATION ROW --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Advisers Column */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <GraduationCap size={16} className="text-blue-500"/> Advisers
                </h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">SE II Professor</label>
                        <select
                        value={formData.se2Adviser}
                        onChange={(e) => setFormData({ ...formData, se2Adviser: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 p-3 rounded-xl focus:outline-none focus:border-blue-500 text-sm font-bold"
                        >
                        <option value="">Select Professor...</option>
                        {ADVISER_OPTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">PM Professor</label>
                        <select
                        value={formData.pmAdviser}
                        onChange={(e) => setFormData({ ...formData, pmAdviser: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 p-3 rounded-xl focus:outline-none focus:border-blue-500 text-sm font-bold"
                        >
                        <option value="">Select Professor...</option>
                        {ADVISER_OPTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* NEW: Consultation Schedule Column */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <CalendarClock size={16} className="text-amber-500"/> Consultation Schedule
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Day</label>
                        <select
                            value={formData.consultationDay}
                            onChange={(e) => setFormData({ ...formData, consultationDay: e.target.value })}
                            className="w-full bg-amber-50 border border-amber-100 text-amber-900 p-3 rounded-xl focus:outline-none focus:border-amber-400 text-sm font-bold"
                        >
                        <option value="">Select Day</option>
                        {DAYS_OPTIONS.map((day) => <option key={day} value={day}>{day}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Time</label>
                        <select
                            value={formData.consultationTime}
                            onChange={(e) => setFormData({ ...formData, consultationTime: e.target.value })}
                            className="w-full bg-amber-50 border border-amber-100 text-amber-900 p-3 rounded-xl focus:outline-none focus:border-amber-400 text-sm font-bold"
                        >
                        <option value="">Select Time</option>
                        {TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}
                        </select>
                    </div>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                    * Schedule is set for weekly recurring consultations.
                </p>
            </div>
        </div>

        {/* Row 3: Members */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Team Members</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {formData.members.map((m, i) => (
              <input 
                key={i}
                className="bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:border-blue-300 transition-all text-sm font-semibold"
                value={m}
                onChange={e => updateMember(i, e.target.value)}
                placeholder={`Member ${i + 1}`}
              />
            ))}
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-4">
          <div className="flex items-center gap-4">
            <div className="bg-amber-100 text-amber-600 p-3 rounded-2xl"><Crown size={20} /></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Manager</span>
              <select 
                className="bg-transparent font-bold text-sm outline-none cursor-pointer" 
                value={formData.assignPM} 
                onChange={e => setFormData({...formData, assignPM: e.target.value})}
              >
                <option value="">Select from members</option>
                {formData.members.filter(m => m.trim() !== "").map((m, i) => (
                  <option key={i} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={handleCloseForm}
                className="w-full md:w-auto bg-slate-100 hover:bg-slate-200 text-slate-500 px-8 py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={saveGroup} 
                disabled={isSaving}
                className="w-full md:w-auto bg-slate-900 hover:bg-blue-600 text-white px-10 py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50"
              >
                {isSaving ? 'Processing...' : (isEditing ? 'Update Record' : 'Register Group')}
              </button>
          </div>
        </div>
      </section>
      )}



      {/* GROUPS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
       
{sortedGroups.map((group) => {
          // 1. Determine Defense Mode based on PM Adviser
          const isOnline = ONLINE_PMS.includes(group.pmAdviser);
          const isF2F = F2F_PMS.includes(group.pmAdviser);

          // 2. Define Dynamic Styles
          let cardClasses = "bg-white border-slate-200 hover:border-slate-400"; // Default
          let statusBadge = null;

          if (isOnline) {
            cardClasses = "bg-yellow-50/50 border-yellow-200 hover:border-yellow-400 hover:shadow-yellow-100";
            statusBadge = (
              <span className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-yellow-200">
                <Laptop size={10}/> Online Defense
              </span>
            );
          } else if (isF2F) {
            cardClasses = "bg-blue-50/50 border-blue-200 hover:border-blue-400 hover:shadow-blue-100";
            statusBadge = (
              <span className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-200">
                <School size={10} /> Face-to-Face Defense
              </span>
            );
          } else if (group.isPinned) {
             // Fallback for pinned if no PM assigned yet
             cardClasses = "border-amber-200 bg-amber-50/10";
          }

          return (
            <div 
              key={group._id} 
              onClick={() => router.push(`/groups/${group._id}`)}
              className={`p-8 rounded-[40px] border shadow-sm transition-all duration-300 ease-out cursor-pointer flex flex-col justify-between group/card
                        hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:-translate-y-2 
                        ${cardClasses}`}
            >
              <div>
                {/* NEW: Status Badge Display */}
                {statusBadge}

                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                        <div className={`h-14 w-14 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-lg
                                        transition-all duration-300 group-hover/card:scale-110 
                                        ${isOnline ? 'bg-yellow-500 shadow-yellow-200' : isF2F ? 'bg-blue-600 shadow-blue-200' : 'bg-slate-900'}`}>
                          {group.groupName?.substring(0, 2).toUpperCase()}
                        </div>
                      
                      {/* Sections */}
                      <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Section</span>
                          <div className="flex flex-wrap gap-1">
                              {group.sections && group.sections.length > 0 ? (
                                  group.sections.map((section: string, index: number) => (
                                      <span 
                                          key={index} 
                                          className="bg-white/60 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-bold border border-slate-200/50"
                                      >
                                          {section}
                                      </span>
                                  ))
                              ) : (
                                  <span className="text-slate-400 text-[10px] italic">No Section</span>
                              )}
                          </div>
                      </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 relative z-10">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleTogglePin(group._id, group.isPinned); 
                      }}
                      className={`p-3 rounded-xl transition-all ${
                        group.isPinned 
                          ? 'bg-amber-100 text-amber-600 shadow-sm' 
                          : 'bg-white/50 text-slate-300 hover:text-amber-600 hover:bg-amber-50'
                      }`}
                    >
                      <Pin 
                        size={18} 
                        className={group.isPinned ? "fill-current" : "-rotate-45"} 
                      />
                    </button>
                  </div>
                </div>

                <h3 className={`text-xl font-bold mb-2 transition-colors ${isOnline ? 'text-yellow-900' : isF2F ? 'text-blue-900' : 'text-slate-800'}`}>
                  {group.groupName}
                </h3>
                
                <p className="text-slate-500 text-sm italic line-clamp-2 border-l-2 border-slate-200 pl-3 mb-6">
                  "{group.thesisTitle}"
                </p>

                {/* Advisers Display */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                   <div className="bg-white/60 p-3 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">SE2 Adviser</p>
                      <p className="text-xs font-bold text-slate-700 truncate">{group.se2Adviser || "—"}</p>
                   </div>
                   <div className={`p-3 rounded-xl border transition-colors ${isOnline ? 'bg-yellow-100 border-yellow-200' : isF2F ? 'bg-blue-100 border-blue-200' : 'bg-white/60 border-slate-100'}`}>
                      <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${isOnline ? 'text-yellow-600' : isF2F ? 'text-blue-600' : 'text-slate-400'}`}>PM Adviser</p>
                      <p className={`text-xs font-bold truncate ${isOnline ? 'text-yellow-900' : isF2F ? 'text-blue-900' : 'text-slate-700'}`}>{group.pmAdviser || "—"}</p>
                   </div>
                </div>

                {/* Members Display */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {group.members.map((m: any, i: number) => (
                    <span key={i} className={`text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-tight border transition-all ${
                      m === group.assignPM 
                      ? "bg-amber-100 text-amber-600 border-amber-200" 
                      : "bg-white/50 text-slate-400 border-slate-100"
                    }`}>
                      {m === group.assignPM && "👑 "}{m}
                    </span>
                  ))}
                </div>

                {/* BOTTOM: CONSULTATION TIME */}
                <div className="pt-3 border-t border-slate-200/50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                      <div className="bg-slate-100 p-1.5 rounded-lg text-slate-500">
                          <Clock size={14} />
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Consultation Time</span>
                          <span className="text-xs font-bold text-slate-700">
                              {group.consultationDay || "Day Unset"} @ {group.consultationTime || "Time Unset"}
                          </span>
                      </div>
                  </div>
                </div>
              </div>
            </div>
          );
      })}
      </div>
      </div>
  );
}