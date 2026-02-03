"use client";

import React, { useState, useEffect } from 'react';
import { 
  Calendar, Video, MapPin, Save, Clock, 
  FileText, MessageSquare, Star, ChevronDown, ChevronUp,
  Trash2, Edit2, Download 
} from 'lucide-react';

import { 
  getGroupsFromDB, 
  updateMockSchedule, 
  submitDefenseGrade,
  deleteDefenseGrade, 
  editDefenseGrade   
} from "@/app/actions";
import { recordAuditLog } from "@/app/actions";
// --- TYPES ---
interface Grade {
  _id?: string; // Added ID for editing/deleting
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
  
  // NEW: Editing State
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
    console.log("Saving changes:", scheduleChanges); 
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

  // Open modal for NEW grade
  const openGradeModal = (group: Group) => {
    setSelectedGroup(group);
    setEditingGrade(null); // Ensure we are not in edit mode
    setGradeForm({ name: "", pres: 67, paper: 67, comment: "" });
    setShowGradeModal(true);
  };

  // Open modal for EDITING existing grade
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
        // --- UPDATE EXISTING ---
        await editDefenseGrade(editingGrade.groupId, editingGrade.grade._id, gradeForm);
        alert("✅ Grade Updated!");
    } else {
        // --- CREATE NEW ---
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
            <div className="max-w-6xl mx-auto pb-20 p-6">
              
              {/* HEADER */}
              <div className="flex justify-between items-end mb-8 border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Mock Defense Dashboard</h1>
            <p className="text-slate-500">Manage schedules and grading for Final Defense</p>
          </div>
          
          <div className="flex gap-2"> {/* 👈 Wrap buttons in a div for layout */}
            
            {/* 👇 NEW EXPORT BUTTON */}
            <button 
              onClick={() => exportToCSV(groups)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
              title="Download Excel Report"
            >
              <Download size={18} /> Export Data
            </button>

            {/* EXISTING SCHEDULER BUTTON */}
            <button 
              onClick={() => setShowScheduler(!showScheduler)}
              className="flex items-center gap-2 text-blue-600 font-bold hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors"
            >
              {showScheduler ? "Hide Scheduler" : "Edit Schedule"} 
              {showScheduler ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
            </button>
            
          </div>
        </div>

      {/* --- SECTION 1: SCHEDULER (Collapsible) --- */}
      {showScheduler && (
        <div className="bg-white border p-6 rounded-2xl shadow-lg mb-12 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="text-blue-500"/> Schedule Arranger
            </h2>
            <button onClick={saveAllSchedules} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2">
              <Save size={18}/> Save Changes
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(group => (
              <div key={group._id} className="border p-4 rounded-xl bg-slate-50">
                <div className="font-bold text-slate-700 mb-2 truncate">{group.groupName}</div>
                <input 
                  type="datetime-local" 
                  className="w-full mb-2 p-2 border rounded text-sm"
                  value={
                    scheduleChanges[group._id]?.date ?? 
                    toLocalISOString(group.mockDefenseDate)
                  }
                  onChange={(e) => handleScheduleChange(group._id, 'date', e.target.value)}
                />
                <select 
                  className="w-full p-2 border rounded text-sm bg-white"
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* FACE TO FACE COLUMN */}
        <AgendaColumn 
            title="Face-to-Face Sessions" 
            icon={<MapPin className="text-red-500"/>} 
            groups={f2fGroups} 
            onOpenGrade={openGradeModal}
            onPreview={(url: string) => setPreviewUrl(url)}
            getAverage={getAverage}
            // 👇 PASS NEW HANDLERS HERE
            onEdit={handleEditClick}
            onDelete={handleDeleteGrade}
        />

        {/* ONLINE COLUMN */}
        <AgendaColumn 
            title="Online Sessions" 
            icon={<Video className="text-green-500"/>} 
            groups={onlineGroups} 
            onOpenGrade={openGradeModal}
            onPreview={(url: string) => setPreviewUrl(url)}
            getAverage={getAverage}
            // 👇 AND HERE
            onEdit={handleEditClick}
            onDelete={handleDeleteGrade}
        />
      </div>

      {/* --- MODAL: GRADING --- */}
      {showGradeModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-4">
              <h3 className="font-bold text-lg">
                {editingGrade ? "Edit Grade" : "Grade"}: {selectedGroup.groupName}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              
              {/* Panelist Name */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Panelist Name (Optional)</label>
                <input 
                  type="text" 
                  placeholder="Leave empty for Anonymous"
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={gradeForm.name}
                  onChange={e => setGradeForm({...gradeForm, name: e.target.value})}
                />
              </div>

              {/* Scores with Validation */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Presentation (0-100)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    // 👇 These classes hide the spinner arrows
                    className="w-full border p-2 rounded-lg font-mono font-bold text-lg text-center focus:ring-2 focus:ring-blue-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={gradeForm.pres}
                    onChange={e => {
                        // 👇 Strict 0-100 Validation
                        let val = Number(e.target.value);
                        if (val > 100) val = 100;
                        if (val < 0) val = 0;
                        setGradeForm({...gradeForm, pres: val});
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Paper Progress (0-100)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    // 👇 These classes hide the spinner arrows
                    className="w-full border p-2 rounded-lg font-mono font-bold text-lg text-center focus:ring-2 focus:ring-green-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={gradeForm.paper}
                    onChange={e => {
                        // 👇 Strict 0-100 Validation
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
                <label className="text-xs font-bold text-slate-500 uppercase">Comments / Feedback</label>
                <textarea 
                  className="w-full border p-2 rounded-lg h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Write constructive feedback here..."
                  value={gradeForm.comment}
                  onChange={e => setGradeForm({...gradeForm, comment: e.target.value})}
                ></textarea>
              </div>

              {/* Footer Actions */}
              <div className="flex gap-2 pt-2">
                <button onClick={closeGradeModal} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                <button onClick={submitGrade} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                    {editingGrade ? "Update Grade" : "Submit Grade"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: DOCUMENT PREVIEW --- */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col p-4">
          <div className="flex justify-end mb-2">
             <button onClick={() => setPreviewUrl(null)} className="text-white bg-white/20 hover:bg-white/40 rounded-full p-2">
                <span className="sr-only">Close</span> ✖
             </button>
          </div>
          <div className="flex-1 bg-white rounded-xl overflow-hidden">
                        <embed 
            src={`${previewUrl}`} 
            className="w-full h-full" 
            type="application/pdf" 
/>
          </div>
        </div>
      )}

    </div>
  );
}

function AgendaColumn({ title, icon, groups, onOpenGrade, onPreview, getAverage, onEdit, onDelete }: any) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2 pb-2 border-b">
        {icon} {title}
      </h2>
      <div className="space-y-6">
        {groups.length === 0 ? <div className="text-slate-400 italic">No groups scheduled.</div> : null}
        
        {groups.map((group: Group) => {
            const hasFile = group.files && group.files.length > 0;
            const fileUrl = hasFile ? group.files![group.files!.length - 1].url : null;
            const avgGrade = getAverage(group.mockDefenseGrades);

            return (
              <div key={group._id} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Time Badge */}
                <div className="bg-slate-50 p-3 border-b flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-600 font-mono text-sm font-bold">
                        <Clock size={16}/>
                        {/* 👇 UPDATED DATE FORMAT: "Jan 31, 10:00 AM" */}
                        {new Date(group.mockDefenseDate!).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: 'numeric', 
                            minute: '2-digit'
                        })}
                    </div>
                    {Number(avgGrade) > 0 && (
                        <div className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-black flex items-center gap-1">
                            <Star size={12} fill="currentColor"/> AVG: {avgGrade}
                        </div>
                    )}
                </div>

                <div className="p-5">
                    <div className="text-xs font-bold text-blue-600 uppercase mb-1">{group.groupName}</div>
                    <h3 className="font-bold text-lg leading-tight mb-4">{group.thesisTitle || "Untitled Project"}</h3>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 mb-6">
                        <button 
                            disabled={!fileUrl}
                            onClick={() => fileUrl && onPreview(fileUrl)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <FileText size={14}/> {fileUrl ? "View Doc" : "No PDF"}
                        </button>
                        <button 
                            onClick={() => onOpenGrade(group)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                        >
                            <Star size={14}/> Rate / Grade
                        </button>
                    </div>

                    {/* Consolidated Comments & Scores */}
                    {group.mockDefenseGrades && group.mockDefenseGrades.length > 0 && (
                        <div className="bg-slate-50 rounded-lg p-3 border">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-1">
                                <MessageSquare size={10}/> Feedback & Grades ({group.mockDefenseGrades.length})
                            </h4>
                            
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                {group.mockDefenseGrades.map((g: any, i: number) => (
                                    <div key={i} className="bg-white p-3 rounded border shadow-sm relative group/card">
                                        
                                        {/* Header: Name & Edit Actions */}
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-slate-700 text-xs">
                                                {g.panelistName || "Anonymous"}
                                            </span>
                                            <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => onEdit(group._id, g)} 
                                                    className="text-blue-500 hover:bg-blue-50 p-1 rounded"
                                                    title="Edit Grade"
                                                >
                                                    <Edit2 size={12}/>
                                                </button>
                                                <button 
                                                    onClick={() => onDelete(group._id, g._id)} 
                                                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                    title="Delete Grade"
                                                >
                                                    <Trash2 size={12}/>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Scores Badge */}
                                        <div className="flex gap-2 mb-2">
                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold">
                                                Pres: {g.presentationScore}
                                            </span>
                                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-mono font-bold">
                                                Paper: {g.paperScore}
                                            </span>
                                        </div>

                                        {/* The Comment */}
                                        <div className="text-xs text-slate-600 italic leading-relaxed">
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

// Helper to convert DB date to "YYYY-MM-DDThh:mm" for input fields
// This preserves YOUR local timezone instead of shifting to UTC
const toLocalISOString = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  // Get the timezone offset in milliseconds
  const offset = date.getTimezoneOffset() * 60000; 
  // Adjust the date to fool the ISO converter
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().slice(0, 16);
};

// --- EXPORT HELPER ---
const exportToCSV = (groups: Group[]) => {
  // 1. Define the Column Headers
  const headers = [
    "Group Name",
    "Thesis Title",
    "Schedule",
    "Mode",
    "Panelist Name",
    "Presentation Score",
    "Paper Score",
    "Average",
    "Feedback / Comments"
  ];

  // 2. Process the Data (Flattening groups -> rows)
  const rows: string[] = [];

  groups.forEach(group => {
    const date = group.mockDefenseDate 
      ? new Date(group.mockDefenseDate).toLocaleString('en-US') 
      : "Unscheduled";

    // If no grades, add a row just to show the group exists
    if (!group.mockDefenseGrades || group.mockDefenseGrades.length === 0) {
      rows.push([
        `"${group.groupName}"`,
        `"${group.thesisTitle || ''}"`,
        `"${date}"`,
        group.mockDefenseMode || "F2F",
        "PENDING",
        "0", "0", "0",
        "No grades recorded yet"
      ].join(","));
    } else {
      // Create one row per grade/panelist
      group.mockDefenseGrades.forEach(grade => {
        const avg = ((grade.presentationScore + grade.paperScore) / 2).toFixed(1);
        // Escape quotes inside comments to prevent CSV breaking
        const safeComment = grade.comment ? grade.comment.replace(/"/g, '""') : "";

        rows.push([
          `"${group.groupName}"`,
          `"${group.thesisTitle || ''}"`,
          `"${date}"`,
          group.mockDefenseMode || "F2F",
          `"${grade.panelistName}"`,
          grade.presentationScore,
          grade.paperScore,
          avg,
          `"${safeComment}"`
        ].join(","));
      });
    }
  });

  // 3. Combine and Download
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