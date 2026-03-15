"use client";

import React, { useState, useEffect } from 'react';
import { 
  Calendar, Video, MapPin, Save, Clock, 
  FileText, MessageSquare, Star, ChevronDown, ChevronUp,
  Trash2, Edit2, Download 
} from 'lucide-react';
import GlobalLoader from "../../components/GlobalLoader";

import { 
  getGroupsFromDB, 
  updateMockSchedule, 
  submitDefenseGrade,
  deleteDefenseGrade, 
  editDefenseGrade,
  recordAuditLog 
} from "../actions";

// --- TYPES ---
interface Grade {
  _id?: string; 
  panelistName: string;
  presentationScore: number;
  paperScore: number;
  comment: string;
}

interface Group {
  _id: string;
  groupName: string;
  thesisTitle: string;
  mockDefenseDate?: string;
  mockDefenseMode?: 'F2F' | 'Online';
  mockDefenseGrades?: Grade[];
  files?: { url: string }[];
}

export default function MockDefensePage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Scheduler State
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleChanges, setScheduleChanges] = useState<{[key:string]: {date: string, mode: string}}>({});
  
  // Grading Modal State
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradeForm, setGradeForm] = useState({ name: "", pres: 67, paper: 67, comment: "" });
  
  // Editing State
  const [editingGrade, setEditingGrade] = useState<{groupId: string, grade: any} | null>(null);

  // Document Preview State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // --- 1. LOAD DATA ---
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getGroupsFromDB();
    if (data) setGroups(JSON.parse(JSON.stringify(data)));
    setLoading(false);
  };

  // --- 2. SCHEDULER LOGIC ---
  const handleScheduleChange = (id: string, field: 'date' | 'mode', value: string) => {
    setScheduleChanges(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
        date: field === 'date' ? value : (prev[id]?.date || groups.find(g => g._id === id)?.mockDefenseDate || ""),
        mode: field === 'mode' ? value : (prev[id]?.mode || groups.find(g => g._id === id)?.mockDefenseMode || "F2F"),
      }
    }));
  };

  const saveAllSchedules = async () => {
    const updates = Object.keys(scheduleChanges).map(id => ({
      groupId: id,
      date: scheduleChanges[id].date,
      mode: scheduleChanges[id].mode
    }));

    if (updates.length === 0) {
      alert("No changes detected to save.");
      return;
    }

    const result = await updateMockSchedule(updates);
    if (result.success) {
      alert("✅ Schedule Saved!");
      setShowScheduler(false);
      loadData(); 
    } else {
      alert("❌ Save failed: " + result.error);
    }
  };

  const openGradeModal = (group: Group) => {
    setSelectedGroup(group);
    setEditingGrade(null); 
    setGradeForm({ name: "", pres: 67, paper: 67, comment: "" });
    setShowGradeModal(true);
  };

  const handleEditClick = (groupId: string, grade: any) => {
    setSelectedGroup(groups.find(g => g._id === groupId) || null);
    setEditingGrade({ groupId, grade });
    setGradeForm({
      name: grade.panelistName,
      pres: grade.presentationScore,
      paper: grade.paperScore,
      comment: grade.comment
    });
    setShowGradeModal(true);
  };

  const handleDeleteGrade = async (groupId: string, gradeId: string) => {
    if(!confirm("Are you sure you want to delete this grade?")) return;
    await deleteDefenseGrade(groupId, gradeId);
    loadData();
  };

  const closeGradeModal = () => {
    setShowGradeModal(false);
    setEditingGrade(null);
    setGradeForm({ name: "", pres: 67, paper: 67, comment: "" });
  };

  const submitGrade = async () => {
    if (!selectedGroup) return;
    
    if (editingGrade) {
        await editDefenseGrade(editingGrade.groupId, editingGrade.grade._id, gradeForm);
        alert("✅ Grade Updated!");
    } else {
        await submitDefenseGrade(selectedGroup._id, {
            panelistName: gradeForm.name || "Anonymous Panelist",
            presentationScore: Number(gradeForm.pres),
            paperScore: Number(gradeForm.paper),
            comment: gradeForm.comment
        });
        alert("✅ Grade Submitted!");
    }

    closeGradeModal();
    loadData();
  };

  // --- 4. RENDER HELPERS ---
  const scheduledGroups = groups
    .filter(g => g.mockDefenseDate)
    .sort((a, b) => new Date(a.mockDefenseDate!).getTime() - new Date(b.mockDefenseDate!).getTime());

  const f2fGroups = scheduledGroups.filter(g => g.mockDefenseMode === 'F2F');
  const onlineGroups = scheduledGroups.filter(g => g.mockDefenseMode === 'Online');

  const getAverage = (grades: Grade[] = []) => {
    if (grades.length === 0) return 0;
    const total = grades.reduce((acc, curr) => acc + ((curr.presentationScore + curr.paperScore) / 2), 0);
    return (total / grades.length).toFixed(1);
  };

  return (
    <>       
    {loading && <GlobalLoader />}

      <div className="relative min-h-screen w-full text-slate-200 selection:bg-fuchsia-500/30">
        
        {/* Animated Background Orbs (Consistent with Dashboard) */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-fuchsia-600/5 rounded-full blur-[150px] mix-blend-screen pointer-events-none"></div>

        <div className="max-w-7xl mx-auto pb-20 p-6 md:p-8 relative z-10">
                
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 border-b border-white/10 pb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] tracking-tight">Mock Defense Dashboard</h1>
              <p className="text-indigo-200/60 font-medium mt-2">Manage schedules and grading for Final Defense.</p>
            </div>
            
            <div className="flex flex-wrap gap-3"> 
              
              {/* EXPORT BUTTON */}
              <button 
                onClick={() => exportToCSV(groups)}
                className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-4 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] text-sm"
                title="Download Excel Report"
              >
                <Download size={18} /> Export Data
              </button>

              {/* SCHEDULER BUTTON */}
              <button 
                onClick={() => setShowScheduler(!showScheduler)}
                className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold px-4 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.1)] text-sm"
              >
                {showScheduler ? "Hide Scheduler" : "Edit Schedule"} 
                {showScheduler ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
              </button>
              
            </div>
          </div>

        {/* --- SECTION 1: SCHEDULER (Collapsible) --- */}
        {showScheduler && (
          <div className="bg-[#060B19]/80 backdrop-blur-2xl border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.4)] mb-12 animate-in fade-in slide-in-from-top-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <Calendar className="text-indigo-400"/> Schedule Arranger
              </h2>
              <button onClick={saveAllSchedules} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)] text-sm">
                <Save size={18}/> Save Changes
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map(group => (
                <div key={group._id} className="border border-white/10 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="font-bold text-fuchsia-400 mb-3 truncate text-sm" title={group.groupName}>{group.groupName}</div>
                  
                  {/* [color-scheme:dark] forces the calendar popup to be dark mode! */}
                  <input 
                    type="datetime-local" 
                    className="w-full mb-3 p-2.5 border border-white/10 rounded-xl text-sm bg-black/40 text-white focus:outline-none focus:border-indigo-500/50 [color-scheme:dark]"
                    value={
                      scheduleChanges[group._id]?.date ?? 
                      toLocalISOString(group.mockDefenseDate)
                    }
                    onChange={(e) => handleScheduleChange(group._id, 'date', e.target.value)}
                  />
                  <select 
                    className="w-full p-2.5 border border-white/10 rounded-xl text-sm bg-black/40 text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                    defaultValue={group.mockDefenseMode || "F2F"}
                    onChange={(e) => handleScheduleChange(group._id, 'mode', e.target.value as any)}
                  >
                    <option value="F2F">Face-to-Face (Campus)</option>
                    <option value="Online">Online (Zoom/Meet)</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- SECTION 2: DEFENSE AGENDA --- */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* FACE TO FACE COLUMN */}
          <AgendaColumn 
              title="Face-to-Face Sessions" 
              icon={<MapPin className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"/>} 
              groups={f2fGroups} 
              onOpenGrade={openGradeModal}
              onPreview={(url: string) => setPreviewUrl(url)}
              getAverage={getAverage}
              onEdit={handleEditClick}
              onDelete={handleDeleteGrade}
          />

          {/* ONLINE COLUMN */}
          <AgendaColumn 
              title="Online Sessions" 
              icon={<Video className="text-fuchsia-400 drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]"/>} 
              groups={onlineGroups} 
              onOpenGrade={openGradeModal}
              onPreview={(url: string) => setPreviewUrl(url)}
              getAverage={getAverage}
              onEdit={handleEditClick}
              onDelete={handleDeleteGrade}
          />
        </div>

        {/* --- MODAL: GRADING --- */}
        {showGradeModal && selectedGroup && (
          <div className="fixed inset-0 bg-[#060B19]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#0B1026] border border-white/10 rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              <div className="bg-white/5 border-b border-white/10 p-5 flex items-center justify-between">
                <h3 className="font-bold text-lg text-white">
                  {editingGrade ? "Edit Grade" : "Grade"}: <span className="text-fuchsia-400">{selectedGroup.groupName}</span>
                </h3>
                <button onClick={closeGradeModal} className="text-slate-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-5">
                
                {/* Panelist Name */}
                <div>
                  <label className="text-[10px] font-bold text-indigo-200/50 uppercase tracking-widest mb-1.5 block">Panelist Name (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="Leave empty for Anonymous"
                    className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-xl focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none text-sm placeholder:text-slate-600 transition-all"
                    value={gradeForm.name}
                    onChange={e => setGradeForm({...gradeForm, name: e.target.value})}
                  />
                </div>

                {/* Scores with Validation */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-indigo-200/50 uppercase tracking-widest mb-1.5 block">Presentation (0-100)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      className="w-full bg-black/50 border border-white/10 text-indigo-400 p-3 rounded-xl font-mono font-black text-xl text-center focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all shadow-inner"
                      value={gradeForm.pres}
                      onChange={e => {
                          let val = Number(e.target.value);
                          if (val > 100) val = 100;
                          if (val < 0) val = 0;
                          setGradeForm({...gradeForm, pres: val});
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-indigo-200/50 uppercase tracking-widest mb-1.5 block">Paper Progress (0-100)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      className="w-full bg-black/50 border border-white/10 text-emerald-400 p-3 rounded-xl font-mono font-black text-xl text-center focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all shadow-inner"
                      value={gradeForm.paper}
                      onChange={e => {
                          let val = Number(e.target.value);
                          if (val > 100) val = 100;
                          if (val < 0) val = 0;
                          setGradeForm({...gradeForm, paper: val});
                      }}
                    />
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <label className="text-[10px] font-bold text-indigo-200/50 uppercase tracking-widest mb-1.5 block">Comments / Feedback</label>
                  <textarea 
                    className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-xl h-24 resize-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none text-sm placeholder:text-slate-600 transition-all custom-scrollbar"
                    placeholder="Write constructive feedback here..."
                    value={gradeForm.comment}
                    onChange={e => setGradeForm({...gradeForm, comment: e.target.value})}
                  ></textarea>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-3 pt-4 border-t border-white/10 mt-2">
                  <button onClick={closeGradeModal} className="flex-1 bg-white/5 border border-white/10 text-slate-300 font-bold py-3 rounded-xl hover:bg-white/10 transition-colors text-sm">Cancel</button>
                  <button onClick={submitGrade} className="flex-1 bg-indigo-600 border border-indigo-500 text-white font-bold py-3 rounded-xl hover:bg-indigo-500 transition-colors shadow-[0_0_15px_rgba(99,102,241,0.4)] text-sm">
                      {editingGrade ? "Update Grade" : "Submit Grade"}
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* --- MODAL: DOCUMENT PREVIEW --- */}
        {previewUrl && (
          <div className="fixed inset-0 bg-[#060B19]/90 backdrop-blur-md z-[60] flex flex-col p-4 md:p-8">
            <div className="flex justify-end mb-4">
               <button onClick={() => setPreviewUrl(null)} className="text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-full p-2.5 transition-colors">
                  <X size={24} />
               </button>
            </div>
            <div className="flex-1 bg-white rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <embed src={`${previewUrl}`} className="w-full h-full" type="application/pdf" />
            </div>
          </div>
        )}

      </div>
    </div>
    </>
  );
}

function AgendaColumn({ title, icon, groups, onOpenGrade, onPreview, getAverage, onEdit, onDelete }: any) {
  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl shadow-inner">{icon}</div> 
        {title}
      </h2>
      
      <div className="space-y-5 flex-1">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 bg-white/5 border border-white/5 border-dashed rounded-[2rem] text-indigo-200/40 text-sm h-full min-h-[200px]">
            No groups scheduled for this sector.
          </div>
        ) : null}
        
        {groups.map((group: Group) => {
            const hasFile = group.files && group.files.length > 0;
            const fileUrl = hasFile ? group.files![group.files!.length - 1].url : null;
            const avgGrade = getAverage(group.mockDefenseGrades);

            return (
              <div key={group._id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] shadow-sm hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] hover:border-indigo-500/30 transition-all duration-300 overflow-hidden flex flex-col group">
                
                {/* Time Badge (Header) */}
                <div className="bg-black/30 p-4 border-b border-white/5 flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2 text-indigo-200/80 font-mono text-sm font-bold">
                        <Clock size={16} className="text-indigo-400"/>
                        {new Date(group.mockDefenseDate!).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: 'numeric', 
                            minute: '2-digit'
                        })}
                    </div>
                    {Number(avgGrade) > 0 && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2.5 py-1 rounded-md text-xs font-black flex items-center gap-1.5 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                            <Star size={12} fill="currentColor"/> AVG: {avgGrade}
                        </div>
                    )}
                </div>

                {/* Card Body */}
                <div className="p-5 flex flex-col flex-1">
                    <div className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest mb-1.5 bg-fuchsia-500/10 border border-fuchsia-500/20 w-fit px-2 py-0.5 rounded-md">{group.groupName}</div>
                    <h3 className="font-bold text-lg text-white leading-tight mb-5">{group.thesisTitle || "Untitled Project"}</h3>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3 mb-6 mt-auto">
                        <button 
                            disabled={!fileUrl}
                            onClick={() => fileUrl && onPreview(fileUrl)}
                            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-30 disabled:hover:bg-white/5 transition-all"
                        >
                            <FileText size={16}/> {fileUrl ? "View Doc" : "No PDF"}
                        </button>
                        <button 
                            onClick={() => onOpenGrade(group)}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all"
                        >
                            <Star size={16}/> Rate / Grade
                        </button>
                    </div>

                    {/* Consolidated Comments & Scores */}
                    {group.mockDefenseGrades && group.mockDefenseGrades.length > 0 && (
                        <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                            <h4 className="text-[10px] font-bold text-indigo-200/50 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <MessageSquare size={12}/> Feedback & Grades ({group.mockDefenseGrades.length})
                            </h4>
                            
                            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                {group.mockDefenseGrades.map((g: any, i: number) => (
                                    <div key={i} className="bg-white/5 p-3.5 rounded-xl border border-white/10 relative group/card hover:border-indigo-500/30 transition-colors">
                                        
                                        {/* Header: Name & Edit Actions */}
                                        <div className="flex justify-between items-start mb-2.5">
                                            <span className="font-bold text-slate-200 text-xs">
                                                {g.panelistName || "Anonymous"}
                                            </span>
                                            <div className="flex gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => onEdit(group._id, g)} 
                                                    className="text-indigo-400 hover:bg-indigo-500/20 p-1 rounded-md transition-colors"
                                                    title="Edit Grade"
                                                >
                                                    <Edit2 size={12}/>
                                                </button>
                                                <button 
                                                    onClick={() => onDelete(group._id, g._id)} 
                                                    className="text-red-400 hover:bg-red-500/20 p-1 rounded-md transition-colors"
                                                    title="Delete Grade"
                                                >
                                                    <Trash2 size={12}/>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Scores Badge */}
                                        <div className="flex gap-2 mb-2.5">
                                            <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md font-mono font-bold">
                                                Pres: {g.presentationScore}
                                            </span>
                                            <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md font-mono font-bold">
                                                Paper: {g.paperScore}
                                            </span>
                                        </div>

                                        {/* The Comment */}
                                        <div className="text-xs text-indigo-200/70 italic leading-relaxed">
                                            "{g.comment}"
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
}

const toLocalISOString = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const offset = date.getTimezoneOffset() * 60000; 
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().slice(0, 16);
};

const exportToCSV = (groups: Group[]) => {
  const headers = [
    "Group Name", "Thesis Title", "Schedule", "Mode", 
    "Panelist Name", "Presentation Score", "Paper Score", 
    "Average", "Feedback / Comments"
  ];

  const rows: string[] = [];

  groups.forEach(group => {
    const date = group.mockDefenseDate 
      ? new Date(group.mockDefenseDate).toLocaleString('en-US') 
      : "Unscheduled";

    if (!group.mockDefenseGrades || group.mockDefenseGrades.length === 0) {
      rows.push([
        `"${group.groupName}"`, `"${group.thesisTitle || ''}"`, `"${date}"`,
        group.mockDefenseMode || "F2F", "PENDING", "0", "0", "0", "No grades recorded yet"
      ].join(","));
    } else {
      group.mockDefenseGrades.forEach(grade => {
        const avg = ((grade.presentationScore + grade.paperScore) / 2).toFixed(1);
        const safeComment = grade.comment ? grade.comment.replace(/"/g, '""') : "";

        rows.push([
          `"${group.groupName}"`, `"${group.thesisTitle || ''}"`, `"${date}"`,
          group.mockDefenseMode || "F2F", `"${grade.panelistName}"`,
          grade.presentationScore, grade.paperScore, avg, `"${safeComment}"`
        ].join(","));
      });
    }
  });

  const csvContent = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Mock_Defense_Grades_Report_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};