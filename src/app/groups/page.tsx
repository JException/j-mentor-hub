"use client";
import React, { useState, useEffect } from 'react';
import { Save, Trash2, Edit3, Users, Crown, Plus, X, Database, CheckCircle2, Calendar } from 'lucide-react';
import { saveGroupToDB, getGroupsFromDB } from "@/app/actions";

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    groupName: '', 
    thesisTitle: '', 
    members: ['', '', '', ''], 
    projectManager: ''
  });

  // Load from MongoDB on startup
  useEffect(() => {
    const loadData = async () => {
      const data = await getGroupsFromDB();
      setGroups(data);
    };
    loadData();
  }, []);

  const saveGroup = async () => {
  if (!formData.groupName || !formData.thesisTitle) {
    alert("Please fill in the Group Name and Thesis Title.");
    return;
  }

  // CREATE THE DATA OBJECT TO MATCH THE DATABASE SCHEMA
  const dataToSave = {
    groupName: formData.groupName,
    thesisTitle: formData.thesisTitle,
    members: formData.members.filter(m => m !== ""), // Cleans up empty member boxes
    assignPM: formData.projectManager // THIS MAPS projectManager TO assignPM
  };

  try {
    const result = await saveGroupToDB(dataToSave); 
    if (result.success) {
      // Refresh the list and clear the form
      const updatedData = await getGroupsFromDB();
      setGroups(updatedData);
      setFormData({ groupName: '', thesisTitle: '', members: ['', '', '', ''], projectManager: '' });
      setIsEditing(null);
    } else {
      alert("Save failed: " + result.error);
    }
  } catch (error) {
    console.error("Save Error:", error);
  }
};

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* RESTORED HEADER */}
      <header className="space-y-4">
        <h1 className="text-6xl font-medium tracking-tight">Thesis <span className="text-slate-300 italic">Groups</span></h1>
        <p className="text-slate-500 text-xl max-w-2xl leading-relaxed">Register and manage the details of the groups you are currently mentoring.</p>
      </header>

      {/* RESTORED REGISTRATION FORM */}
      <section className="bg-white rounded-[40px] border border-slate-200 shadow-xl p-10 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-400 tracking-widest px-2">Group Name</label>
            <input 
              className="w-full bg-slate-50 border border-slate-100 p-6 rounded-3xl outline-none font-bold text-xl focus:border-blue-500/20" 
              placeholder="e.g. Project Cyber" 
              value={formData.groupName} 
              onChange={e => setFormData({...formData, groupName: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-400 tracking-widest px-2">Thesis Title</label>
            <input 
              className="w-full bg-slate-50 border border-slate-100 p-6 rounded-3xl outline-none font-bold text-xl focus:border-blue-500/20" 
              placeholder="e.g. AI-Powered Automation" 
              value={formData.thesisTitle} 
              onChange={e => setFormData({...formData, thesisTitle: e.target.value})} 
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-black uppercase text-slate-400 tracking-widest px-2">Members</label>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {formData.members.map((m, i) => (
              <input 
                key={i} 
                className="bg-white border border-slate-200 p-5 rounded-2xl outline-none text-sm font-medium focus:border-blue-500/20 shadow-sm" 
                placeholder={`Member ${i+1}`} 
                value={m} 
                onChange={e => {
                  const newM = [...formData.members]; 
                  newM[i] = e.target.value; 
                  setFormData({...formData, members: newM});
                }} 
              />
            ))}
          </div>
        </div>

        {/* PM ASSIGNMENT & BUTTON SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-50 pt-10">
          <div className="flex items-center gap-4">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Assign PM:</span>
            <select 
              className="bg-slate-100 p-4 rounded-2xl text-xs font-black outline-none border border-slate-100" 
              value={formData.projectManager} 
              onChange={e => setFormData({...formData, projectManager: e.target.value})}
            >
              <option value="">Select a member</option>
              {formData.members.filter(m => m).map((m, i) => <option key={i} value={m}>{m}</option>)}
            </select>
          </div>
          <button 
            onClick={saveGroup} 
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-200 flex items-center justify-center gap-3 transition-all"
          >
            <Save size={18} /> {isEditing !== null ? 'Update Record' : 'Register Group'}
          </button>
        </div>
      </section>

      {/* RESTORED DATA LIST */}
      <div className="grid gap-6 pb-20">
        {groups.map((g, i) => (
         <div key={i} className="bg-white p-10 rounded-[40px] border border-slate-200 flex flex-col md:flex-row items-center justify-between group hover:bg-slate-100 hover:border-slate-400 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
         <div className="flex items-center gap-10">
              <div className="h-20 w-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center text-2xl font-black">
                {g.groupName ? g.groupName.substring(0,2).toUpperCase() : '??'}
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-bold tracking-tight text-slate-800">{g.groupName}</h3>
                <p className="text-slate-400 font-medium italic text-lg leading-tight mb-4">{g.thesisTitle}</p>
                <div className="flex flex-wrap gap-2">
                 {g.members?.filter((m: any) => m).map((m: any, mi: number) => (
                    <span 
                      key={mi} 
                      className={`text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-widest 
                        ${m === g.assignPM ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-50 text-slate-400'}`}
                    >
                      {m === g.assignPM && '👑 '} {m}
                    </span>
                  ))}

                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}